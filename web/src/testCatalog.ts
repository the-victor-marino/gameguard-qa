export type TestGroup = "Unit" | "Integration" | "Destructive" | "Regression" | "Performance";
export type Case = {
  id: string; group: TestGroup; file: string; functionName: string;
  why: string; expected: string; example: string; skill: string;
};

type Template = Omit<Case, "id"> & { variations?: string[] };
const templates: Template[] = [
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_valid_game_state_passes_validation",why:"A perfectly valid player state must be accepted.",expected:"Validation completes without an error.",example:"A level-12 player with legal health and items.",skill:"Positive testing"},
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_health_outside_boundaries_is_rejected",variations:["health = -1","health = 101"],why:"Values immediately outside the allowed health range should fail.",expected:"ValueError mentioning health.",example:"HP cannot drop below 0 or exceed 100 in saved state.",skill:"Boundary Value Analysis"},
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_health_boundary_values_are_accepted",variations:["health = 0","health = 1","health = 99","health = 100"],why:"Real boundary values must be accepted, not rejected by an off-by-one bug.",expected:"Validation succeeds.",example:"Exactly 0 HP is legal; -1 is not.",skill:"Boundary Value Analysis"},
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_negative_currency_is_rejected",why:"Negative gold means broken economy data.",expected:"ValueError mentioning currency.",example:"Gold = -1.",skill:"Negative testing"},
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_duplicate_unique_item_is_rejected",why:"Players should not obtain duplicate copies of a unique item.",expected:"ValueError for duplicate unique item.",example:"Two legendary keys marked unique.",skill:"Invariant testing"},
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_invalid_quest_state_is_rejected",why:"An unknown state can break a quest chain.",expected:"ValueError for invalid quest state.",example:"Quest state = almost_done.",skill:"State validation"},
  {group:"Unit", file:"tests/unit/test_game_state.py",functionName:"test_future_save_version_is_rejected",why:"A build should not claim to understand unknown future save formats.",expected:"ValueError for unsupported version.",example:"Save version 999.",skill:"Equivalence Partitioning"},
  {group:"Destructive", file:"tests/destructive/test_save_guardian.py",functionName:"test_known_good_save_is_safe",why:"The scanner must not flag known-good saves as corrupt.",expected:"Safe report; zero issues.",example:"Valid v2 JSON fixture.",skill:"False-positive control"},
  {group:"Destructive", file:"tests/destructive/test_save_guardian.py",functionName:"test_corrupted_progression_save_is_rejected",why:"One scan should report multiple independent corruptions.",expected:"Unsafe report with codes SAVE-005/006/007/008/011/013.",example:"Bad HP, level, map, gold, unique item and quest.",skill:"Destructive testing"},
  {group:"Destructive", file:"tests/destructive/test_save_guardian.py",functionName:"test_truncated_json_is_reported_without_crashing",why:"Partial file writes should be diagnosed gracefully.",expected:"CRITICAL issue SAVE-017.",example:"JSON text stops midway through a field.",skill:"Error handling"},
  {group:"Destructive", file:"tests/destructive/test_save_guardian.py",functionName:"test_empty_save_is_critical",why:"An empty save file is a potential loss of all progression.",expected:"CRITICAL issue SAVE-016.",example:"Zero-byte save file.",skill:"Negative testing"},
  {group:"Destructive", file:"tests/destructive/test_save_guardian.py",functionName:"test_missing_save_file_is_critical",why:"Missing data should trigger a clear diagnosis.",expected:"CRITICAL issue SAVE-014.",example:"Save path does not exist.",skill:"Negative testing"},
  {group:"Integration", file:"tests/integration/test_save_load.py",functionName:"test_save_load_round_trip_preserves_game_state",why:"Writing and then reading a save must preserve state.",expected:"Restored GameState equals original.",example:"Save → JSON → Load.",skill:"Integration testing"},
  {group:"Integration", file:"tests/integration/test_save_load.py",functionName:"test_malformed_json_is_rejected",why:"The real loader must reject broken JSON.",expected:"ValueError containing corrupted.",example:"Incomplete JSON document.",skill:"Error handling"},
  {group:"Integration", file:"tests/integration/test_save_load.py",functionName:"test_missing_required_player_data_is_rejected",why:"A save without essential player data cannot be trusted.",expected:"ValueError for invalid structure.",example:"Player object with only level.",skill:"Schema integrity"},
  {group:"Integration", file:"tests/integration/test_quality_gate.py",functionName:"test_release_candidate_passes_when_all_evidence_is_green",why:"A good save and healthy performance should pass the gate.",expected:"PASS with zero release blockers.",example:"Valid v2 + good metrics.",skill:"Release acceptance"},
  {group:"Integration", file:"tests/integration/test_quality_gate.py",functionName:"test_release_is_blocked_by_save_and_performance_defects",why:"Both types of defects should independently block release.",expected:"FAIL with SAVE- and PERF- blockers.",example:"Corrupted save + slow build.",skill:"Risk-based testing"},
  {group:"Regression", file:"tests/regression/test_save_compatibility.py",functionName:"test_v1_save_migrates_to_current_version",why:"Old player saves must receive safe defaults for new fields.",expected:"v2, experience, difficulty and equipped fields exist.",example:"v1 → v2 upgrade.",skill:"Backward compatibility"},
  {group:"Regression", file:"tests/regression/test_save_compatibility.py",functionName:"test_migration_preserves_player_progression",why:"A load can succeed while silently deleting player progress.",expected:"Owned items, gold, quests, player position unchanged.",example:"Protect the Moonblade and 4,820 gold.",skill:"Data integrity"},
  {group:"Regression", file:"tests/regression/test_save_compatibility.py",functionName:"test_legacy_save_loads_in_current_build",why:"The real save loader should transparently migrate legacy files.",expected:"Level 27, 4,820 gold, Moonblade and active quest.",example:"Load a v1 save using the v2 build.",skill:"Regression testing"},
  {group:"Regression", file:"tests/regression/test_save_compatibility.py",functionName:"test_unknown_future_save_has_no_migration_path",why:"Unsupported formats should not be silently interpreted.",expected:"ValueError for missing migration path.",example:"Version 999.",skill:"Compatibility boundaries"},
  {group:"Performance", file:"tests/performance/test_performance_regression.py",functionName:"test_build_inside_performance_budget_passes",why:"Small acceptable changes should not block a build.",expected:"PASS for all three performance metrics.",example:"Good load, frame and memory measurements.",skill:"Performance budgets"},
  {group:"Performance", file:"tests/performance/test_performance_regression.py",functionName:"test_regressed_build_is_detected",why:"Noticeably worse performance should be caught.",expected:"FAIL on load time, p95 frame time and memory.",example:"2350ms load / 21ms p95 / 1820MB.",skill:"Performance regression"},
  {group:"Performance", file:"tests/performance/test_performance_regression.py",functionName:"test_missing_metric_is_rejected",why:"Missing telemetry is not a passing measurement.",expected:"ValueError for missing metric.",example:"No current load time reported.",skill:"Data validation"},
  {group:"Unit", file:"tests/unit/test_reporting.py",functionName:"test_report_exposes_release_evidence",why:"A passing report should summarize the evidence accurately.",expected:"PASS, both checks PASS, APPROVED.",example:"Good save + good metrics.",skill:"Reporting verification"},
  {group:"Unit", file:"tests/unit/test_reporting.py",functionName:"test_report_makes_regressions_visible",why:"Reports must not hide known failures.",expected:"FAIL, SAVE-005, BLOCKED.",example:"Corrupted save + bad metrics.",skill:"Reporting verification"}
];
export const testCases: Case[] = templates.flatMap((t) => {
  const values = t.variations?.length ? t.variations : [""];
  return values.map((variant, i) => ({
    id: t.functionName + (variant ? "[" + i + "]" : ""),
    group: t.group, file: t.file, functionName: t.functionName,
    why: t.why, expected: t.expected, example: variant || t.example, skill: t.skill
  }));
});
export const repoBase = "https://github.com/the-victor-marino/gameguard-qa/blob/main/";
