import { ChangeDetectionStrategy, Component, computed, resource, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { defineForm, NguForm, type DynamicField } from 'ngu-form';
import { fetchQuestions } from '../api/fake-survey';

type Answers = Record<string, string | number | boolean>;

@Component({
  selector: 'app-survey',
  imports: [NguForm, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo-toolbar">
      @if (questions.isLoading()) {
        <span class="demo-status" role="status">Loading questions…</span>
      }
      <button type="button" (click)="addQuestion()">Add question</button>
      <button type="button" (click)="removeQuestion()" [disabled]="extra().length === 0">Remove added</button>
    </div>
    <ngu-form [form]="survey" submitLabel="Send answers" (submitted)="sent.set($event)" />
    @if (sent(); as value) {
      <pre class="demo-result">{{ value | json }}</pre>
    }
  `,
})
export class SurveyForm {
  /** Question definitions from the (fake) server. */
  protected readonly questions = resource({ loader: ({ abortSignal }) => fetchQuestions(abortSignal) });
  /** Questions added in the browser at run time. */
  protected readonly extra = signal<DynamicField[]>([]);
  private readonly allQuestions = computed(() => [...(this.questions.value() ?? []), ...this.extra()]);

  protected readonly sent = signal<{ respondent: string; answers: Answers } | undefined>(undefined);

  protected readonly survey = defineForm({ respondent: '', answers: {} as Answers }, {
    respondent: { label: 'Your name', required: true },
    answers: {
      title: 'Questions',
      description: 'Loaded from the server at run time.',
      cols: 2,
      fields: this.allQuestions,
    },
  });

  protected addQuestion(): void {
    const n = this.extra().length + 1;
    this.extra.update((list) => [...list, { key: `extra${n}`, label: `Extra question ${n}`, required: true }]);
  }

  protected removeQuestion(): void {
    this.extra.update((list) => list.slice(0, -1));
  }
}
