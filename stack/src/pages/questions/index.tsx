// /questions redirects to home (which is the questions list)
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function QuestionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
