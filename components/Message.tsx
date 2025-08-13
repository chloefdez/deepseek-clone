import React from "react";
import Image from "next/image";
import { assets } from "@/assets/assets";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

const Message: React.FC<MessageProps> = ({ role, content }) => {
  const isUser = role === "user";

  return (
    <div className="flex w-full max-w-3xl justify-center text-sm">
      <div className={`flex w-full flex-col ${isUser ? "items-end" : ""} mb-8`}>
        <div
          className={[
            "group relative flex max-w-2xl rounded-xl py-3",
            isUser ? "bg-[#414158] px-5" : "gap-3",
          ].join(" ")}
        >
          <div
            className={[
              "absolute transition-all opacity-0 group-hover:opacity-100",
              isUser ? "-left-16 top-2.5" : "left-9 -bottom-6",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 opacity-70">
              {isUser ? (
                <>
                  <Image
                    src={assets.copy_icon}
                    alt="Copy"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                  />
                  <Image
                    src={assets.pencil_icon}
                    alt="Edit"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                  />
                </>
              ) : (
                <>
                  <Image
                    src={assets.copy_icon}
                    alt="Copy"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                  />
                  <Image
                    src={assets.regenerate_icon}
                    alt="Regenerate"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                  />
                  <Image
                    src={assets.like_icon}
                    alt="Like"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                  />
                  <Image
                    src={assets.dislike_icon}
                    alt="Dislike"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                  />
                </>
              )}
            </div>
          </div>

          {isUser ? (
            <span className="text-white/90">{content}</span>
          ) : (
            <>
              <Image
                src={assets.logo_icon}
                alt="Assistant"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-white/15 p-1"
              />
              <div className="w-full space-y-4 overflow-auto">{content}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;