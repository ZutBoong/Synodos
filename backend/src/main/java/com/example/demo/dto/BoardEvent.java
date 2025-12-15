package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BoardEvent {
	private String eventType;    // COLUMN_CREATED, COLUMN_UPDATED, COLUMN_DELETED,
	                             // TASK_CREATED, TASK_UPDATED, TASK_DELETED,
	                             // COLUMN_MOVED, TASK_MOVED
	private String entityType;   // "column" or "task"
	private Object payload;      // The actual entity data
	private int teamId;          // For routing
	private long timestamp;      // Event timestamp
}
