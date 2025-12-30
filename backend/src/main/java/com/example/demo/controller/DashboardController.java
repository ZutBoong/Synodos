package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.DashboardSummaryDto;
import com.example.demo.service.DashboardService;

@RestController
@RequestMapping("/api/teams")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/{teamId}/dashboard")
    public DashboardSummaryDto getDashboard(@PathVariable Long teamId) {
        return dashboardService.getSummary(teamId);
    }
}