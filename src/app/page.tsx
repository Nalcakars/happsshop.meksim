import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2b1b45] via-[#3a2366] to-[#845ec2]">
      <main className="flex flex-col items-center justify-center gap-6 px-6 text-center">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Doğuş SPA Logo"
          width={220}
          height={80}
          priority
          className="h-auto w-[200px]"
        />

        {/* Subtitle */}
        <p className="max-w-md text-base text-white/80">
          Çok yakında hizmetinizde olacaktır.
        </p>
      </main>
    </div>
  );
}
