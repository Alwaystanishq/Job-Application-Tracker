"use client";

import { useEffect, useState } from "react";
import { Board, Column, JobApplication } from "../models/models.type";
import { updateJobApplication } from "../actions/jobApplication";

export function useBoard(initialBoard?: Board | null) {
  // Derive board directly (no need to store separately)
  const board = initialBoard ?? null;

  const [columns, setColumns] = useState<Column[]>(
    initialBoard?.columns || []
  );
  const [error, setError] = useState<string | null>(null);

  // Sync columns when initialBoard changes
  useEffect(() => {
    setColumns(initialBoard?.columns || []);
  }, [initialBoard]);

  async function moveJob(
    jobApplicationId: string,
    newColumnId: string,
    newOrder: number
  ) {
    let previousColumns: Column[] = [];

    // Optimistic UI update
    setColumns((prev) => {
      previousColumns = prev;

      const newColumns = prev.map((col) => ({
        ...col,
        jobApplications: [...col.jobApplications],
      }));

      let jobToMove: JobApplication | null = null;

      // Remove job from old column
      for (const col of newColumns) {
        const jobIndex = col.jobApplications.findIndex(
          (j) => j._id === jobApplicationId
        );

        if (jobIndex !== -1) {
          jobToMove = col.jobApplications[jobIndex];
          col.jobApplications.splice(jobIndex, 1);
          break;
        }
      }

      // Add job to new column
      if (jobToMove) {
        const targetColumnIndex = newColumns.findIndex(
          (col) => col._id === newColumnId
        );

        if (targetColumnIndex !== -1) {
          const targetColumn = newColumns[targetColumnIndex];
          const updatedJobs = [...targetColumn.jobApplications];

          updatedJobs.splice(newOrder, 0, {
            ...jobToMove,
            columnId: newColumnId,
          });

          // Recalculate order
          const jobsWithUpdatedOrders = updatedJobs.map((job, idx) => ({
            ...job,
            order: idx * 100,
          }));

          newColumns[targetColumnIndex] = {
            ...targetColumn,
            jobApplications: jobsWithUpdatedOrders,
          };
        }
      }

      return newColumns;
    });

    try {
      await updateJobApplication(jobApplicationId, {
        columnId: newColumnId,
        order: newOrder,
      });
    } catch (err) {
      console.error("Error updating job:", err);

      // Rollback on failure
      setColumns(previousColumns);
      setError("Failed to move job. Please try again.");
    }
  }

  return { board, columns, error, moveJob };
}