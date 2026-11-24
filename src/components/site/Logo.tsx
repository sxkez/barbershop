import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/images/brand/hani-logo.png";

export function Logo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="HANI BARBERSHOP – zur Startseite" className={`inline-flex shrink-0 ${className}`}>
      <Image src={logo} alt="HANI BARBERSHOP" priority={priority} className="h-auto w-full" sizes="220px" />
    </Link>
  );
}
