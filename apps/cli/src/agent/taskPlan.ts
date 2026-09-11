export interface TaskStep {
  title: string;
  status: "pending" | "in_progress" | "done" | "failed";
}

export class TaskPlan {
  steps: TaskStep[] = [];

  set(titles: string[]) {
    this.steps = titles.map((title) => ({ title, status: "pending" as const }));
  }

  start(index: number) {
    if (this.steps[index]) this.steps[index].status = "in_progress";
  }

  complete(index: number) {
    if (this.steps[index]) this.steps[index].status = "done";
  }

  fail(index: number) {
    if (this.steps[index]) this.steps[index].status = "failed";
  }

  isEmpty(): boolean {
    return this.steps.length === 0;
  }

  render(): string {
    return this.steps
      .map((s, i) => {
        const marker =
          s.status === "done" ? "✓" : s.status === "failed" ? "✗" : s.status === "in_progress" ? "◐" : "○";
        return `${marker} Task ${i + 1}/${this.steps.length}: ${s.title}`;
      })
      .join("\n");
  }
}
