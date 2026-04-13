"use client"

import { cn } from "@/lib/utils"
import { Search, Star, Paperclip } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Email } from "@/lib/email-data"

interface MessageListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
}

export function MessageList({ emails, selectedEmail, onSelectEmail }: MessageListProps) {
  return (
    <div className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            className="pl-9 bg-secondary border-0 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <button
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className={cn(
              "w-full text-left p-4 border-b border-border transition-colors",
              selectedEmail?.id === email.id
                ? "bg-accent/10"
                : "hover:bg-secondary/50",
              !email.read && "bg-secondary/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn(
                    "text-sm truncate",
                    !email.read ? "font-semibold text-foreground" : "font-medium text-foreground"
                  )}>
                    {email.from.name}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {email.time}
                  </span>
                </div>
                <div className={cn(
                  "text-sm truncate mb-1",
                  !email.read ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {email.subject}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {email.preview}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {email.starred && (
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  )}
                  {email.attachments && email.attachments.length > 0 && (
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                  )}
                  {email.labels?.slice(0, 2).map((label) => (
                    <span
                      key={label}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
