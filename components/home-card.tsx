import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type HomeCardProps = {
  className: string;
  img: string;
  title: string;
  description: string;
  handleClick: () => void;
};

const HomeCard = ({ className, img, title, description, handleClick }: HomeCardProps) => {
  return (
    <button
      className={cn("webinar-action-row", className)}
      onClick={handleClick}
      type="button"
    >
      <div className="webinar-action-icon">
        <Image src={img} alt="" width={25} height={25} />
      </div>
      <div className="webinar-action-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="webinar-action-arrow" aria-hidden="true">↗</span>
    </button>
  );
};

export default HomeCard;
