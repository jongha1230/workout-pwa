import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Workout PWA</CardTitle>
          <CardDescription>원하는 작업을 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/routines">루틴 보기</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/routines/new">루틴 추가</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
