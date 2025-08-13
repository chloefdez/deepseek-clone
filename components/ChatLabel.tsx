import React from "react";
import Image from "next/image";
import { assets } from "@/assets/assets";

type OpenMenu = { id: number; open: boolean };

type ChatLabelProps = {
  id: number; 
  openMenu: OpenMenu;
  setOpenMenu: React.Dispatch<React.SetStateAction<OpenMenu>>;
  name?: string;
};

const ChatLabel: React.FC<ChatLabelProps> = ({
  id,
  openMenu,
  setOpenMenu,
  name = "Chat Name Here",
}) => {
  const isOpen = openMenu.open && openMenu.id === id;

  const toggleMenu = () => {
    setOpenMenu((prev) =>
      prev.id === id ? { id, open: !prev.open } : { id, open: true }
    );
  };

  const closeMenu = () => setOpenMenu({ id, open: false });

  return (
    <div
      className="group flex cursor-pointer items-center justify-between rounded-lg p-2 text-sm text-white/80 hover:bg-white/10"
      onMouseLeave={closeMenu}
    >
      <p className="truncate group-hover:max-w-5/6">{name}</p>

      <div className="group relative flex h-6 w-6 items-center justify-center rounded-lg hover:bg-black/80">
        <Image
          src={assets.three_dots}
          alt="menu"
          width={16}
          height={16}
          className={`w-4 ${isOpen ? "" : "hidden"} group-hover:block`}
          onClick={(e) => {
            e.stopPropagation();
            toggleMenu();
          }}
        />

        <div
          className={`absolute -right-36 top-6 w-max rounded-xl bg-gray-700 p-2 ${
            isOpen ? "" : "hidden"
          }`}
        >
          <button
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: wire rename modal/action here
              closeMenu();
            }}
          >
            <Image
              src={assets.pencil_icon}
              alt="rename"
              width={16}
              height={16}
            />
            <p>Rename</p>
          </button>

          <button
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: call delete API here
              closeMenu();
            }}
          >
            <Image
              src={assets.delete_icon}
              alt="delete"
              width={16}
              height={16}
            />
            <p>Delete</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatLabel;