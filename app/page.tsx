"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🔥</span>
          </div>
          <span className="font-bold text-xl">CreatorHeat</span>
        </div>
        <SignOutButton />
      </header>
      <main className="p-8 flex flex-col gap-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            CreatorHeat
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Intelligent Lead Magnet Platform with Attention Analytics
          </p>
          <p className="text-lg mb-8">
            Turn any blog post, guide, or digital resource into an intelligent
            lead magnet. Track exactly what parts of your content your audience
            cares about using heatmaps generated from real user interactions.
          </p>
        </div>
        <Content />
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-200 dark:bg-slate-800 text-foreground rounded-md px-2 py-1"
          onClick={() =>
            void signOut().then(() => {
              router.push("/");
            })
          }
        >
          Sign out
        </button>
      )}
    </>
  );
}

function Content() {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  // Redirect logged-in users to dashboard
  if (isAuthenticated) {
    router.push("/dashboard");
    return (
      <div className="flex items-center justify-center py-8">
        <p>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">How CreatorHeat Works</h2>
        <p className="text-muted-foreground mb-8">
          Transform your content into intelligent lead magnets in three simple
          steps:
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StepCard
          number="1"
          title="Create"
          description="Write your content using our rich text editor. Add formatting, images, and structure your lead magnet."
        />
        <StepCard
          number="2"
          title="Publish"
          description="Generate a shareable link instantly. Your lead magnet is ready to be distributed to your audience."
        />
        <StepCard
          number="3"
          title="Analyze"
          description="Track user interactions with heatmaps and analytics. See what content resonates most with your audience."
        />
      </div>

      <div className="text-center">
        <Link
          href="/signin"
          className="inline-flex px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all font-semibold"
        >
          Get Started - It's Free
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-6 border border-border rounded-lg hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-6 border border-border rounded-lg text-center">
      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
        {number}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
