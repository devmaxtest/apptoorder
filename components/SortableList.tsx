import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, dragHandleProps: DragHandleProps) => ReactNode;
  onReorder: (reorderedItems: T[]) => void;
}

export interface DragHandleProps {
  ref: (node: HTMLElement | null) => void;
  listeners: Record<string, Function> | undefined;
  attributes: Record<string, any>;
  style: React.CSSProperties;
  className: string;
  "data-testid": string;
}

function SortableItem<T>({
  item,
  index,
  id,
  renderItem,
}: {
  item: T;
  index: number;
  id: string;
  renderItem: (item: T, index: number, dragHandleProps: DragHandleProps) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)" : undefined,
    borderRadius: isDragging ? "8px" : undefined,
    backgroundColor: isDragging ? "var(--background, white)" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, index, {
        ref: setActivatorNodeRef,
        listeners,
        attributes,
        style: { cursor: isDragging ? "grabbing" : "grab", touchAction: "none" },
        className: "flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors",
        "data-testid": `drag-handle-${index}`,
      })}
    </div>
  );
}

export function SortableList<T>({ items, keyExtractor, renderItem, onReorder }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  const ids = items.map(keyExtractor);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <SortableItem
              key={keyExtractor(item)}
              id={keyExtractor(item)}
              item={item}
              index={index}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function DragHandle(props: DragHandleProps) {
  const { ref, listeners, attributes, style, className, "data-testid": testId } = props;
  return (
    <div
      ref={ref}
      {...listeners}
      {...attributes}
      style={style}
      className={className}
      data-testid={testId}
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
}
