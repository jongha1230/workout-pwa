"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Plus, Sparkles, Target } from "lucide-react";

import { PageShell, StatPill } from "@/components/brand/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRoutine } from "@/entities/routine/repo/routine.repo";

const textareaClassName =
  "glass-field min-h-36 w-full rounded-[1.15rem] px-4 py-3 text-sm leading-7 text-white outline-none transition-[box-shadow,border-color] placeholder:text-white/34 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const namingPrompts = [
  "루틴 이름은 부위 + 목적이 한 번에 보이게 적기",
  "설명에는 템포나 빈도처럼 실제 사용 맥락 남기기",
  "외주 포트폴리오라면 영어 이름보다 읽기 쉬운 구조 우선",
];

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
    <PageShell
      density="compact"
      eyebrow="Design A Routine"
      title="루틴 추가"
      description="이 화면은 단순 입력폼이 아니라 루틴을 설계하는 첫 단계처럼 보여야 합니다. 그래서 폼과 함께 네이밍 힌트, 사용 맥락, 브랜딩 톤을 같이 배치합니다."
      actions={
        <Button asChild size="lg" variant="outline">
          <Link href="/routines">
            <ArrowLeft className="h-4 w-4" />
            루틴 목록으로
          </Link>
        </Button>
      }
      meta={
        <>
          <StatPill label="Goal" value="Readable naming" icon={Target} />
          <StatPill label="Mood" value="Tactical glass" icon={Sparkles} />
          <StatPill label="Next" value="Detail -> Session" icon={Plus} />
        </>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader>
            <p className="brand-kicker">Form</p>
            <CardTitle className="text-3xl">루틴 정보를 입력해 주세요.</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-white/74">
                  루틴 이름
                </span>
                <Input
                  placeholder="루틴 이름 (예: Upper Body)"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-white/74">
                  설명
                </span>
                <textarea
                  className={textareaClassName}
                  placeholder="설명 (선택)"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              {errorMessage ? (
                <p className="rounded-[1.1rem] border border-destructive/20 bg-destructive/12 px-4 py-3 text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "생성 중..." : "생성"}
                </Button>
                <Button asChild type="button" size="lg" variant="outline">
                  <Link href="/routines">취소</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(8,18,21,0.94),rgba(5,11,14,0.88))] text-white">
          <CardHeader>
            <p className="brand-kicker !text-primary/90">Naming Guide</p>
            <CardTitle className="text-3xl text-white">
              좋은 이름 하나가 제품 인상을 바꿉니다.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {namingPrompts.map((prompt, index) => (
              <div
                key={prompt}
                className="hud-chip rounded-[1.2rem] px-4 py-4 text-sm leading-7 text-white/78"
              >
                <span className="mb-3 inline-flex rounded-[0.8rem] border border-primary/14 bg-primary/8 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary/82">
                  Tip 0{index + 1}
                </span>
                <p>{prompt}</p>
              </div>
            ))}
            <p className="text-sm leading-7 text-white/62">
              예: `Strength Flow`, `퇴근 후 상체`, `하체 볼륨 데이`
            </p>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
