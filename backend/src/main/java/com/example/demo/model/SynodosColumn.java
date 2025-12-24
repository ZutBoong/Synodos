package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("synodoscolumn")
public class SynodosColumn {
	private int columnId;
	private String title;
	private int position;
	private int teamId;
	private int projectId;
}
