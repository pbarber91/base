import React, { useState } from 'react';
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MoreHorizontal, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

export default function DiscussionThread({ 
  discussion, 
  replies = [], 
  onReply, 
  onLike, 
  currentUserEmail,
  showReplyForm = true 
}) {
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);
    await onReply(discussion.id, replyContent);
    setReplyContent('');
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Main post */}
      <div className={cn("p-6", discussion.is_pinned && "border-l-4 border-amber-400")}>
        <div className="flex gap-4">
          <UserAvatar 
            name={discussion.author_name}
            imageUrl={discussion.author_avatar}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-800">{discussion.author_name}</span>
              {discussion.is_pinned && (
                <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              )}
              <span className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(discussion.created_date), { addSuffix: true })}
              </span>
            </div>
            
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {discussion.content}
            </p>
            
            <div className="flex items-center gap-4 mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onLike(discussion.id)}
                className="text-slate-500 hover:text-rose-500 gap-2 -ml-2"
              >
                <Heart className="h-4 w-4" />
                {discussion.likes_count || 0}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowReplies(!showReplies)}
                className="text-slate-500 hover:text-blue-500 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                {replies.length || discussion.replies_count || 0} replies
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          {replies.map((reply) => (
            <div key={reply.id} className="p-4 pl-20 border-b border-slate-100 last:border-b-0">
              <div className="flex gap-3">
                <UserAvatar 
                  name={reply.author_name}
                  imageUrl={reply.author_avatar}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-800">{reply.author_name}</span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{reply.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Reply form */}
      {showReplyForm && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/30">
          <div className="flex gap-3">
            <UserAvatar size="sm" />
            <div className="flex-1">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[80px] bg-white resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button 
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}