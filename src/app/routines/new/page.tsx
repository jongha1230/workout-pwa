"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRoutine } from "@/entities/routine/repo/routine.repo";

export default function NewRoutinePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setErrorMessage("루틴 이름을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const routine = await createRoutine({
        name: trimmedName,
        description,
      });
      router.push(`/routines/${routine.id}`);
    } catch {
      setErrorMessage("루틴 생성에 실패했습니다. 다시 시도해 주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>루틴 추가</CardTitle>
          <CardDescription>루틴 이름과 설명을 입력해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <Input
              placeholder="루틴 이름 (예: Upper Body)"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <textarea
              className="min-h-24 rounded-md border px-3 py-2 text-sm"
              placeholder="설명 (선택)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "생성 중..." : "생성"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/routines">취소</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
