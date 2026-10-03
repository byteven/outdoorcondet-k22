import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Dialog wrapper fleksibel untuk mengatur lebar & tinggi.
 */
export function DialogWrapper({
    triggerText = 'Open Dialog',
    trigger,
    title = 'Dialog Title',
    description,
    widthClass = 'sm:max-w-2xl',
    heightClass = 'max-h-[85vh]',
    footer,
    children,
}: {
    triggerText?: string;
    trigger?: ReactNode;
    title?: string;
    description?: string;
    widthClass?: string;
    heightClass?: string;
    footer?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger ?? <Button type="button">{triggerText}</Button>}
            </DialogTrigger>
            <DialogContent
                className={cn(widthClass, heightClass, 'overflow-y-auto bg-white')}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {children}
                <DialogFooter className="bg-transparent pt-2">
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    {footer ?? <Button type="button">Save</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
