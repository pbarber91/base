import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GradientCard from "@/components/ui/GradientCard";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

type Base44User = { email: string } & Record<string, unknown>;

type GroupPayload = {
  name: string;
  description: string;
  type: string;
  church_id: string;
  visibility: string;
  meeting_frequency: string;
  meeting_day: string;
  meeting_time: string;
  cover_image_url: string;
};

export default function CreateGroup() {
  const [user, setUser] = useState<Base44User | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [visibility, setVisibility] = useState<string>("public");
  const [meetingDay, setMeetingDay] = useState<string>("Sunday");
  const [meetingTime, setMeetingTime] = useState<string>("18:00");

  useEffect(() => {
    base44.auth.me().then((u: any) => setUser(u as Base44User)).catch(() => setUser(null));
  }, []);

  const { data: churches = [] } = useQuery({
    queryKey: ["my-churches", user?.email],
    queryFn: () => base44.entities.Church.filter({ created_by: user!.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const defaultChurchId = useMemo(() => {
    if (!churches || churches.length === 0) return "";
    return churches[0].id as string;
  }, [churches]);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;

    const formData = new FormData(e.currentTarget);
    const getStr = (key: string) => (formData.get(key)?.toString() ?? "").trim();

    const payload: GroupPayload = {
      name: getStr("name"),
      description: getStr("description"),
      type: getStr("type") || "small_group",
      church_id: getStr("church_id") || defaultChurchId,
      visibility,
      meeting_frequency: getStr("meeting_frequency") || "weekly",
      meeting_day: meetingDay,
      meeting_time: meetingTime,
      cover_image_url: getStr("cover_image_url"),
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
          <p className="text-slate-600 mb-6">Create a group for your church community to connect and grow together.</p>

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
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small_group">Small Group</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Church</Label>
                <Select name="church_id" defaultValue={defaultChurchId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a church" />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="church_only">Church Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Meeting Day</Label>
                <Select value={meetingDay} onValueChange={setMeetingDay}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                      <SelectItem key={d} value={d}>
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
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Meeting Frequency</Label>
                <Select name="meeting_frequency" defaultValue="weekly">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cover Image URL (optional)</Label>
                <Input name="cover_image_url" placeholder="https://..." className="mt-1" />
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
