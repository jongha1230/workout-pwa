import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Routine = {
  id: string;
  name: string;
  description: string;
};

const DUMMY_ROUTINES: Routine[] = [
  {
    id: "routine-upper",
    name: "Upper Body",
    description: "Push + pull 기본 루틴",
  },
  {
    id: "routine-lower",
    name: "Lower Body",
    description: "Squat + hinge 기본 루틴",
  },
];

export default function RoutinesPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">루틴</h1>
      {DUMMY_ROUTINES.map((routine) => (
        <Card key={routine.id}>
          <CardHeader>
            <CardTitle>{routine.name}</CardTitle>
            <CardDescription>{routine.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link
                href={`/session/new?routineId=${encodeURIComponent(routine.id)}`}
              >
                이 루틴으로 시작
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
