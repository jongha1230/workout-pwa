"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Sparkles, Target } from "lucide-react";

import { PageShell, StatPill } from "@/components/brand/page-shell";
import { RoutineTemplateForm } from "@/components/routine/routine-template-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createRoutine } from "@/entities/routine/repo/routine.repo";

const namingPrompts = [
  "어떤 부위와 목적의 루틴인지 한눈에 보이게 적어 주세요.",
  "설명에는 반복 요일, 강도, 템포처럼 실제 운동할 때 참고할 내용을 남겨 주세요.",
  "나중에 다시 고르기 쉽도록 너무 긴 이름보다 짧고 구체적인 이름을 권장합니다.",
];

export default function NewRoutinePage() {
  const router = useRouter();

  return (
    <PageShell
      density="compact"
      eyebrow="새 루틴 만들기"
      title="루틴 추가"
      description="자주 반복하는 운동 구성을 루틴으로 저장해 세션 시작을 빠르게 만들 수 있습니다. 이름, 설명, 운동 순서를 정리해 주세요."
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
          <StatPill label="목표" value="반복 운동 저장" icon={Target} />
          <StatPill label="입력" value="운동 순서 정리" icon={Sparkles} />
          <StatPill label="다음" value="세션 시작" icon={Plus} />
        </>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader>
            <p className="brand-kicker">입력 폼</p>
            <CardTitle className="text-3xl">
              루틴 정보를 입력해 주세요.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoutineTemplateForm
              seedExerciseOnEmpty
              submitLabel="생성"
              submittingLabel="생성 중..."
              cancelHref="/routines"
              onSubmit={async (input) => {
                const routine = await createRoutine(input);
                router.push(`/routines/${routine.id}`);
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(8,18,21,0.94),rgba(5,11,14,0.88))] text-white">
          <CardHeader>
            <p className="brand-kicker !text-primary/90">작성 가이드</p>
            <CardTitle className="text-3xl text-white">
              나중에 바로 고를 수 있는 이름이 좋습니다.
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
              예: `상체 근력`, `퇴근 후 하체`, `가벼운 회복 루틴`
            </p>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
