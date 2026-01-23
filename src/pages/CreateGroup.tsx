import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Users, ArrowLeft, Upload, Image as ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

type Base44User = { email: string; full_name?: string } & Record<string, unknown>;

type GroupPayload = {
  name: string;
  description: string;
  type: string;
  church_id: string | null;
  visibility: string;
  meeting_frequency: string;
  meeting_day: string;
  meeting_time: string;
  cover_image_url: string | null;
};

export default function CreateGroup() {
  const [user, setUser] = useState<Base44User | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [visibility, setVisibility] = useState<string>("public");
  const [meetingDay, setMeetingDay] = useState<string>("Sunday");
  const [meetingTime, setMeetingTime] = useState<string>("18:00");

  // Church selection (controlled so it always renders correctly)
  const [selectedChurchId, setSelectedChurchId] = useState<string>("");

  // Cover image (URL stored in DB)
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  useEffect(() => {
    base44.auth
      .me()
      .then((u: any) => setUser(u as Base44User))
      .catch(() => setUser(null));
  }, []);

  // ✅ Match AdminCourses behavior: list all churches then filter by admin_emails
  const { data: churches = [], isLoading: loadingChurches } = useQuery({
    queryKey: ["churches"],
    queryFn: () => base44.entities.Church.list(),
    enabled: !!user?.email,
  });

  const myChurches = useMemo(() => {
    const email = user?.email;
    if (!email) return [];
    return (churches as any[]).filter((c) => Array.isArray(c.admin_emails) && c.admin_emails.includes(email));
  }, [churches, user?.email]);

  // Default selected church (first available)
  useEffect(() => {
    if (!selectedChurchId && myChurches.length > 0) {
      setSelectedChurchId(String(myChurches[0].id));
    }
  }, [myChurches, selectedChurchId]);

  const createMutation = useMutation<any, unknown, GroupPayload>({
    mutationFn: (data) =>
      base44.entities.Group.create({
        ...data,
        members_count: 1,
        created_by: user!.email,
      }),
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      if (created?.id) {
        navigate(createPageUrl("GroupDetail") + `?id=${created.id}`);
      } else {
        navigate(createPageUrl("Groups"));
      }
    },
  });

  const getAuthedUid = async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  };

  const uploadCoverImage = async (file: File) => {
    setUploadError("");
    setIsUploadingCover(true);

    try {
      const uid = await getAuthedUid();
      if (!uid) throw new Error("You must be signed in to upload images.");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "") || "png";
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const path = `public/groups/covers/${uid}/${id}.${safeExt}`;

      const { error: upErr } = await supabase.storage.from("public-media").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined,
      });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("public-media").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Upload succeeded but could not generate a public URL.");

      setCoverImageUrl(publicUrl);
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const onPickCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    await uploadCoverImage(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    const formData = new FormData(e.currentTarget);
    const getStr = (key: string) => (formData.get(key)?.toString() ?? "").trim();

    const payload: GroupPayload = {
      name: getStr("name"),
      description: getStr("description"),
      type: getStr("type") || "small_group",
      // ✅ allow null if user has no churches (works with your "groups outside church" requirement)
      church_id: selectedChurchId ? selectedChurchId : null,
      visibility,
      meeting_frequency: getStr("meeting_frequency") || "weekly",
      meeting_day: meetingDay,
      meeting_time: meetingTime,
      cover_image_url: coverImageUrl.trim() || null,
    };

    createMutation.mutate(payload);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign in required</h2>
          <Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl("Groups")} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Groups
          </Link>
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4" />
            <span>Create Group</span>
          </div>
        </div>

        <GradientCard variant="warm" className="p-6">
          <h1 className="text-2xl font-semibold text-slate-800 mb-2">Start a new group</h1>
          <p className="text-slate-600 mb-6">Create a group for your community to connect and grow together.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Group Name</Label>
              <Input name="name" required placeholder="e.g., Men's Bible Study" className="mt-1" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea name="description" placeholder="What is this group about?" className="mt-1" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Group Type</Label>
                <Select name="type" defaultValue="small_group">
                  <SelectTrigger className="mt-1 bg-white text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border border-slate-200">
                    <SelectItem value="small_group" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Small Group
                    </SelectItem>
                    <SelectItem value="class" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Class
                    </SelectItem>
                    <SelectItem value="team" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Team
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Church (optional)</Label>
                <Select value={selectedChurchId} onValueChange={setSelectedChurchId}>
                  <SelectTrigger className="mt-1 bg-white text-slate-900">
                    <SelectValue placeholder={loadingChurches ? "Loading…" : "Select church"} />
                  </SelectTrigger>

                  {/* ✅ Force readable dropdown panel + items */}
                  <SelectContent className="bg-white text-slate-900 border border-slate-200">
                    {myChurches.length === 0 ? (
                      <SelectItem value="__none" disabled className="text-slate-500">
                        No churches found for this account
                      </SelectItem>
                    ) : (
                      myChurches.map((c: any) => (
                        <SelectItem
                          key={c.id}
                          value={String(c.id)}
                          className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                        >
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <p className="mt-1 text-xs text-slate-500">
                  Leave blank if this group is independent (not tied to a church).
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="mt-1 bg-white text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border border-slate-200">
                    <SelectItem value="public" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Public
                    </SelectItem>
                    <SelectItem value="church_only" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Church Only
                    </SelectItem>
                    <SelectItem value="private" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Private
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Meeting Day</Label>
                <Select value={meetingDay} onValueChange={setMeetingDay}>
                  <SelectTrigger className="mt-1 bg-white text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border border-slate-200">
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                      <SelectItem
                        key={d}
                        value={d}
                        className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                      >
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Meeting Time</Label>
                <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingTime(e.target.value)}
                  className="mt-1 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Meeting Frequency</Label>
                <Select name="meeting_frequency" defaultValue="weekly">
                  <SelectTrigger className="mt-1 bg-white text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border border-slate-200">
                    <SelectItem value="weekly" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Weekly
                    </SelectItem>
                    <SelectItem value="biweekly" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Every 2 Weeks
                    </SelectItem>
                    <SelectItem value="monthly" className="text-slate-900 focus:bg-slate-100 focus:text-slate-900">
                      Monthly
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cover Image Upload + URL */}
              <div className="space-y-2">
                <Label>Cover Image (optional)</Label>

                {coverImageUrl ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <div className="h-24 w-full overflow-hidden">
                      <img src={coverImageUrl} alt="Cover preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 truncate">{coverImageUrl}</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setCoverImageUrl("")} className="shrink-0">
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-3 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">Upload an image</p>
                        <p className="text-xs text-slate-500">PNG/JPG recommended (public)</p>
                      </div>
                      <label className="inline-flex">
                        <input type="file" accept="image/*" onChange={onPickCoverFile} className="hidden" />
                        <span
                          className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium cursor-pointer border ${
                            isUploadingCover
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {isUploadingCover ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading…
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload
                            </>
                          )}
                        </span>
                      </label>
                    </div>

                    {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
                  </div>
                )}

                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Groups"))}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Group
              </Button>
            </div>
          </form>
        </GradientCard>
      </div>
    </div>
  );
}
