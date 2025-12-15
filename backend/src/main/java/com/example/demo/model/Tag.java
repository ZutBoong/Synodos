package com.example.demo.model;

import lombok.Data;
import java.sql.Date;

@Data
public class Tag {
    private int tagId;
    private int teamId;
    private String tagName;
    private String color;
    private Date createdAt;
}
