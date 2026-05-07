import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function TagsPage() {
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await axiosInstance.get("/question/getallquestion");
        const questions = res.data.data || [];
        const tagMap: Record<string, number> = {};
        questions.forEach((q: any) => {
          (q.questiontags || []).forEach((tag: string) => {
            tagMap[tag] = (tagMap[tag] || 0) + 1;
          });
        });
        const tagList = Object.entries(tagMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setTags(tagList);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  if (loading) {
    return (
      <Mainlayout>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </Mainlayout>
    );
  }

  return (
    <Mainlayout>
      <div className="max-w-6xl">
        <h1 className="text-xl lg:text-2xl font-semibold mb-2">Tags</h1>
        <p className="text-gray-600 text-sm mb-6">
          A tag is a keyword or label that categorizes your question with other, similar questions.
        </p>
        {tags.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">No tags found. Ask a question with tags to see them here.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tags.map((tag) => (
              <div key={tag.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <Link href={`/?tag=${tag.name}`}>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer mb-2">
                    {tag.name}
                  </Badge>
                </Link>
                <p className="text-xs text-gray-600 mt-2">
                  {tag.count} question{tag.count !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Mainlayout>
  );
}
