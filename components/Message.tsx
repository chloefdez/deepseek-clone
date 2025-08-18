import { assets } from "@/assets/assets";
import Image from "next/image";
import React from "react";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

function TypingDots() {
  return (
    <span className="inline-flex gap-1 align-middle">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-[blink_1s_ease-in-out_infinite]" />
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-[blink_1s_ease-in-out_infinite] [animation-delay:.15s]" />
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-[blink_1s_ease-in-out_infinite] [animation-delay:.3s]" />
      <style jsx>{`
        @keyframes blink {
          0%,
          80%,
          100% {
            opacity: 0.2;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
      `}</style>
    </span>
  );
}

const Message = ({ role, content }: MessageProps) => {
  const isAssistant = role === "assistant";
  const showTyping = isAssistant && !content?.trim();

  return (
    <div className="flex flex-col items-center w-full max-w-3xl text-sm">
      <div
        className={`flex flex-col w-full mb-8 ${
          role === "user" && "items-end"
        }`}
      >
        <div
          className={`group relative flex max-w-2xl py-3 rounded-xl ${
            role === "user" ? "bg-[#414158] px-5" : "gap-3"
          }`}
        >
          {/* hover actions */}
          <div
            className={`opacity-0 group-hover:opacity-100 absolute ${
              role === "user" ? "-left-16 top-2.5" : "left-9 -bottom-6"
            } transition-all`}
          >
            <div className="flex items-center gap-2 opacity-70">
              {role === "user" ? (
                <>
                  <Image
                    src={assets.copy_icon}
                    alt=""
                    className="w-4 cursor-pointer"
                  />
                  <Image
                    src={assets.pencil_icon}
                    alt=""
                    className="w-4.5 cursor-pointer"
                  />
                </>
              ) : (
                <>
                  <Image
                    src={assets.copy_icon}
                    alt=""
                    className="w-4.5 cursor-pointer"
                  />
                  <Image
                    src={assets.regenerate_icon}
                    alt=""
                    className="w-4 cursor-pointer"
                  />
                  <Image
                    src={assets.like_icon}
                    alt=""
                    className="w-4 cursor-pointer"
                  />
                  <Image
                    src={assets.dislike_icon}
                    alt=""
                    className="w-4 cursor-pointer"
                  />
                </>
              )}
            </div>
          </div>

          {role === "user" ? (
            <span className="text-white/90">{content}</span>
          ) : (
            <>
              <Image
                src={assets.logo_icon}
                alt=""
                className="h-9 w-9 p-1 border border-white/15 rounded-full"
              />
              <div className="space-y-4 w-full overflow-y-auto">
                {showTyping ? <TypingDots /> : content}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;