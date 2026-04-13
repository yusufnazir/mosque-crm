"use client"

import { cn } from "@/lib/utils"
import {
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal,
  Star,
  Trash2,
  Archive,
  Paperclip,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Email } from "@/lib/email-data"

interface MessageDetailProps {
  email: Email | null
}

export function MessageDetail({ email }: MessageDetailProps) {
  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Select an email to read</p>
      </div>
    )
  }

  const initials = email.from.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Star className={cn("h-4 w-4", email.starred && "fill-amber-400 text-amber-400")} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Forward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-semibold text-foreground mb-6 text-balance">
          {email.subject}
        </h1>

        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-accent text-accent-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-foreground">{email.from.name}</span>
                <span className="text-muted-foreground ml-2 text-sm">
                  {"<"}{email.from.email}{">"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {email.date} at {email.time}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              to {email.to}
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {email.body}
          </div>
        </div>

        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({email.attachments.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-lg group hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  <div className="h-9 w-9 rounded bg-accent/10 flex items-center justify-center">
                    <Paperclip className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {attachment.size}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply Box */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-secondary text-foreground text-xs">
              ME
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={`Reply to ${email.from.name}...`}
              className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button size="sm">Send</Button>
        </div>
      </div>
    </div>
  )
}
