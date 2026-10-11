import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FormStepperStep = {
    label: string;
};

/**
 * Penunjuk tahap formulir: lingkaran bernomor di atas garis konektor,
 * label di bawah setiap lingkaran.
 */
export function FormStepper({
    steps,
    currentStep,
}: {
    steps: FormStepperStep[];
    currentStep: number;
}) {
    return (
        <ol className="flex items-start">
            {steps.map((item, index) => {
                const done = index < currentStep;
                const active = index === currentStep;

                return (
                    <li
                        key={item.label}
                        className="relative flex flex-1 flex-col items-center gap-2"
                    >
                        {index > 0 && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'absolute top-4 right-[calc(50%+1.25rem)] left-[calc(-50%+1.25rem)] h-0.5',
                                    done || active ? 'bg-primary' : 'bg-border',
                                )}
                            />
                        )}
                        <span
                            aria-current={active ? 'step' : undefined}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full border text-sm font-medium',
                                active || done
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background text-muted-foreground',
                            )}
                        >
                            {done ? <Check className="size-4" /> : index + 1}
                        </span>
                        <span
                            className={cn(
                                'text-center text-sm leading-tight',
                                active || done
                                    ? 'font-semibold text-primary'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {item.label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
