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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{"\uC6B4\uB3D9 \uC2DC\uC791"}</CardTitle>
          <CardDescription>
            {
              "\uC6D0\uD558\uB294 \uC791\uC5C5\uC744 \uC120\uD0DD\uD558\uC138\uC694."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/routines">{"\uB8E8\uD2F4 \uBCF4\uAE30"}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/session/new">
              {"\uC138\uC158 \uC2DC\uC791(\uBC14\uB85C)"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
