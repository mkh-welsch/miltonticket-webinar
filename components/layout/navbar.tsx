import Image from "next/image";
import Link from "next/link";
import React from "react";
import MobileNav from "./mobile-nav";
import { getWebinarSession } from "@/lib/auth/session";

const Navbar = async () => {
  const identity = await getWebinarSession();
  return (
    <nav className="flex-between fixed z-50 w-full bg-dark-1 px-6 py-4 lg:px-10">
      <Link href="/" className="flex items-center gap-1">
        <Image
          src={"/icons/logo.svg"}
          width={32}
          height={32}
          alt="Milton Ticket"
          className="max-sm:size-10"
        />
        <p className="text-[22px] font-bold text-white max-sm:hidden">Milton Webinare</p>
      </Link>

      <div className="flex-between gap-5">
        <div className="session-identity max-sm:hidden">
          <span>{identity?.name}</span>
          <small>{identity?.role === "attendee" ? "Teilnahme" : "Host"}</small>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="logout-button" type="submit">Abmelden</button>
        </form>
        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
