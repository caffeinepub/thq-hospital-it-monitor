import Text "mo:core/Text";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Ordering "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // Types

  type Department = {
    id : Nat;
    departmentLabel : Text;
    icon : Text;
    color : Text;
    patientCount : Nat;
  };

  type DepartmentHead = {
    name : Text;
    pin : Text;
    departmentId : Nat;
  };

  type FormTemplate = {
    id : Nat;
    departmentId : Nat;
    title : Text;
    fields : [Text];
  };

  type FieldValue = {
    field : Text;
    value : Text;
  };

  type Report = {
    id : Nat;
    departmentId : Nat;
    submittedBy : Text;
    timestamp : Int;
    fieldValues : [FieldValue];
  };

  type AppConfig = {
    hospitalName : Text;
    departmentName : Text;
    tvRefreshRate : Nat;
  };

  type WaConfig = {
    phoneNumberId : Text;
    accessToken : Text;
    messageFormat : Text;
  };

  type ExternalForm = {
    id : Nat;
    title : Text;
    platform : Text;
    embedUrl : Text;
    departmentId : Nat;
  };

  type SubmissionComment = {
    reportId : Nat;
    comment : Text;
    author : Text;
    timestamp : Int;
  };

  type ActivityLogEntry = {
    id : Nat;
    action : Text;
    user : Text;
    timestamp : Int;
  };

  type BackupData = {
    departments : [Department];
    departmentHeads : [DepartmentHead];
    formTemplates : [FormTemplate];
    reports : [Report];
    externalForms : [ExternalForm];
  };

  module Department {
    public func compare(d1 : Department, d2 : Department) : Ordering.Order {
      Nat.compare(d1.id, d2.id);
    };
  };

  module FormTemplate {
    public func compare(f1 : FormTemplate, f2 : FormTemplate) : Ordering.Order {
      Nat.compare(f1.id, f2.id);
    };
  };

  module ExternalForm {
    public func compare(a : ExternalForm, b : ExternalForm) : Ordering.Order {
      Nat.compare(a.id, b.id);
    };
  };

  module ActivityLogEntry {
    public func compare(a : ActivityLogEntry, b : ActivityLogEntry) : Ordering.Order {
      Nat.compare(a.id, b.id);
    };
  };

  // Stable storage - primary data store
  stable var stableDepartments : [(Nat, Department)] = [];
  stable var stableDepartmentHeads : [(Text, DepartmentHead)] = [];
  stable var stableFormTemplates : [(Nat, FormTemplate)] = [];
  stable var stableReports : [(Nat, Report)] = [];
  stable var stableNextDepartmentId : Nat = 0;
  stable var stableNextFormTemplateId : Nat = 0;
  stable var stableNextReportId : Nat = 0;
  stable var stableAppConfig : ?AppConfig = null;
  stable var stableWaPhoneNumberId : Text = "";
  stable var stableWaAccessToken : Text = "";
  stable var stableWaMessageFormat : Text = "Friendly Reminder: Please submit your {formName} report for {departmentName} by today. Kindly submit your report as early as possible.";
  stable var stableExternalForms : [(Nat, ExternalForm)] = [];
  stable var stableNextExternalFormId : Nat = 0;
  stable var stableFormDeadlines : [(Nat, Text)] = [];
  stable var stableFormVersions : [(Nat, Nat)] = [];
  stable var stableSubmissionComments : [(Nat, SubmissionComment)] = [];
  stable var stableActivityLog : [(Nat, ActivityLogEntry)] = [];
  stable var stableNextActivityLogId : Nat = 0;

  // In-memory maps - initialized from stable storage on every start (fresh install AND upgrade)
  let departments = Map.empty<Nat, Department>();
  let departmentHeads = Map.empty<Text, DepartmentHead>();
  let formTemplates = Map.empty<Nat, FormTemplate>();
  let reports = Map.empty<Nat, Report>();
  let externalForms = Map.empty<Nat, ExternalForm>();
  let formDeadlines = Map.empty<Nat, Text>();
  let formVersions = Map.empty<Nat, Nat>();
  let submissionComments = Map.empty<Nat, SubmissionComment>();
  let activityLog = Map.empty<Nat, ActivityLogEntry>();

  // Initialize maps from stable storage immediately (fixes fresh install data loss)
  do {
    for ((k, v) in stableDepartments.vals()) { departments.add(k, v) };
    for ((k, v) in stableDepartmentHeads.vals()) { departmentHeads.add(k, v) };
    for ((k, v) in stableFormTemplates.vals()) { formTemplates.add(k, v) };
    for ((k, v) in stableReports.vals()) { reports.add(k, v) };
    for ((k, v) in stableExternalForms.vals()) { externalForms.add(k, v) };
    for ((k, v) in stableFormDeadlines.vals()) { formDeadlines.add(k, v) };
    for ((k, v) in stableFormVersions.vals()) { formVersions.add(k, v) };
    for ((k, v) in stableSubmissionComments.vals()) { submissionComments.add(k, v) };
    for ((k, v) in stableActivityLog.vals()) { activityLog.add(k, v) };
  };

  var nextDepartmentId = stableNextDepartmentId;
  var nextFormTemplateId = stableNextFormTemplateId;
  var nextReportId = stableNextReportId;
  var nextExternalFormId = stableNextExternalFormId;
  var nextActivityLogId = stableNextActivityLogId;
  var appConfig : ?AppConfig = stableAppConfig;

  // Upgrade hook - only preupgrade needed now
  system func preupgrade() {
    stableDepartments := departments.entries().toArray();
    stableDepartmentHeads := departmentHeads.entries().toArray();
    stableFormTemplates := formTemplates.entries().toArray();
    stableReports := reports.entries().toArray();
    stableNextDepartmentId := nextDepartmentId;
    stableNextFormTemplateId := nextFormTemplateId;
    stableNextReportId := nextReportId;
    stableAppConfig := appConfig;
    stableExternalForms := externalForms.entries().toArray();
    stableNextExternalFormId := nextExternalFormId;
    stableFormDeadlines := formDeadlines.entries().toArray();
    stableFormVersions := formVersions.entries().toArray();
    stableSubmissionComments := submissionComments.entries().toArray();
    stableActivityLog := activityLog.entries().toArray();
    stableNextActivityLogId := nextActivityLogId;
  };

  // Departments

  public shared ({ caller }) func createDepartment(departmentLabel : Text, icon : Text, color : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can create departments");
    };
    let id = nextDepartmentId;
    let department : Department = { id; departmentLabel; icon; color; patientCount = 0 };
    departments.add(id, department);
    stableDepartments := departments.entries().toArray();
    nextDepartmentId += 1;
    stableNextDepartmentId := nextDepartmentId;
    id;
  };

  public query ({ caller }) func getDepartment(id : Nat) : async ?Department {
    departments.get(id);
  };

  public query ({ caller }) func getAllDepartments() : async [Department] {
    departments.values().toList<Department>().toArray();
  };

  public shared ({ caller }) func updateDepartment(department : Department) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can update departments");
    };
    if (not departments.containsKey(department.id)) {
      Runtime.trap("Department not found");
    };
    departments.add(department.id, department);
    stableDepartments := departments.entries().toArray();
  };

  public shared ({ caller }) func deleteDepartment(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can delete departments");
    };
    if (not departments.containsKey(id)) {
      Runtime.trap("Department not found");
    };
    departments.remove(id);
    stableDepartments := departments.entries().toArray();
  };

  // Department Heads / Users

  public shared ({ caller }) func createDepartmentHead(name : Text, pin : Text, departmentId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can create department heads");
    };
    let departmentHead : DepartmentHead = { name; pin; departmentId };
    departmentHeads.add(pin, departmentHead);
    stableDepartmentHeads := departmentHeads.entries().toArray();
  };

  public query ({ caller }) func getDepartmentHead(pin : Text) : async ?DepartmentHead {
    departmentHeads.get(pin);
  };

  public query ({ caller }) func getAllDepartmentHeads() : async [DepartmentHead] {
    departmentHeads.values().toArray();
  };

  public shared ({ caller }) func updateDepartmentHead(departmentHead : DepartmentHead) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can update department heads");
    };
    if (not departmentHeads.containsKey(departmentHead.pin)) {
      Runtime.trap("Department head not found");
    };
    departmentHeads.add(departmentHead.pin, departmentHead);
    stableDepartmentHeads := departmentHeads.entries().toArray();
  };

  public shared ({ caller }) func deleteDepartmentHead(pin : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can delete department heads");
    };
    if (not departmentHeads.containsKey(pin)) {
      Runtime.trap("Department head not found");
    };
    departmentHeads.remove(pin);
    stableDepartmentHeads := departmentHeads.entries().toArray();
  };

  // Form Templates

  public shared ({ caller }) func createFormTemplate(departmentId : Nat, title : Text, fields : [Text]) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can create form templates");
    };
    let id = nextFormTemplateId;
    let formTemplate : FormTemplate = { id; departmentId; title; fields };
    formTemplates.add(id, formTemplate);
    formVersions.add(id, 1);
    stableFormTemplates := formTemplates.entries().toArray();
    stableFormVersions := formVersions.entries().toArray();
    nextFormTemplateId += 1;
    stableNextFormTemplateId := nextFormTemplateId;
    id;
  };

  public query ({ caller }) func getAllFormTemplates() : async [FormTemplate] {
    formTemplates.values().toList<FormTemplate>().toArray();
  };

  public query ({ caller }) func getFormTemplate(id : Nat) : async ?FormTemplate {
    formTemplates.get(id);
  };

  public shared ({ caller }) func updateFormTemplate(formTemplate : FormTemplate) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can update form templates");
    };
    if (not formTemplates.containsKey(formTemplate.id)) {
      Runtime.trap("Form template not found");
    };
    formTemplates.add(formTemplate.id, formTemplate);
    let currentVersion = switch (formVersions.get(formTemplate.id)) {
      case (?v) { v };
      case (null) { 1 };
    };
    formVersions.add(formTemplate.id, currentVersion + 1);
    stableFormTemplates := formTemplates.entries().toArray();
    stableFormVersions := formVersions.entries().toArray();
  };

  public shared ({ caller }) func deleteFormTemplate(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can delete form templates");
    };
    if (not formTemplates.containsKey(id)) {
      Runtime.trap("Form template not found");
    };
    formTemplates.remove(id);
    stableFormTemplates := formTemplates.entries().toArray();
  };

  // Reports

  public shared ({ caller }) func submitReport(departmentId : Nat, submittedBy : Text, fieldValues : [FieldValue]) : async Nat {
    let id = nextReportId;
    let report : Report = { id; departmentId; submittedBy; timestamp = Time.now(); fieldValues };
    reports.add(id, report);
    stableReports := reports.entries().toArray();
    nextReportId += 1;
    stableNextReportId := nextReportId;
    id;
  };

  public query ({ caller }) func getReport(id : Nat) : async ?Report {
    reports.get(id);
  };

  public query ({ caller }) func getReportsByDepartment(departmentId : Nat) : async [Report] {
    reports.values().toList<Report>().filter(
      func(report) { report.departmentId == departmentId }
    ).toArray();
  };

  public query ({ caller }) func getAllReports() : async [Report] {
    reports.values().toArray();
  };

  // App Config

  public shared ({ caller }) func setAppConfig(config : AppConfig) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can set app config");
    };
    appConfig := ?config;
    stableAppConfig := ?config;
  };

  public query ({ caller }) func getAppConfig() : async ?AppConfig {
    appConfig;
  };

  // WhatsApp Config

  public shared ({ caller }) func setWaConfig(cfg : WaConfig) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can set WhatsApp config");
    };
    stableWaPhoneNumberId := cfg.phoneNumberId;
    stableWaAccessToken := cfg.accessToken;
    stableWaMessageFormat := cfg.messageFormat;
  };

  public query ({ caller }) func getWaConfig() : async WaConfig {
    {
      phoneNumberId = stableWaPhoneNumberId;
      accessToken = stableWaAccessToken;
      messageFormat = stableWaMessageFormat;
    };
  };

  // External Forms

  public shared ({ caller }) func createExternalForm(title : Text, platform : Text, embedUrl : Text, departmentId : Nat) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can create external forms");
    };
    let id = nextExternalFormId;
    let form : ExternalForm = { id; title; platform; embedUrl; departmentId };
    externalForms.add(id, form);
    stableExternalForms := externalForms.entries().toArray();
    nextExternalFormId += 1;
    stableNextExternalFormId := nextExternalFormId;
    id;
  };

  public query ({ caller }) func getAllExternalForms() : async [ExternalForm] {
    externalForms.values().toList<ExternalForm>().toArray();
  };

  public shared ({ caller }) func updateExternalForm(form : ExternalForm) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can update external forms");
    };
    if (not externalForms.containsKey(form.id)) {
      Runtime.trap("External form not found");
    };
    externalForms.add(form.id, form);
    stableExternalForms := externalForms.entries().toArray();
  };

  public shared ({ caller }) func deleteExternalForm(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can delete external forms");
    };
    if (not externalForms.containsKey(id)) {
      Runtime.trap("External form not found");
    };
    externalForms.remove(id);
    stableExternalForms := externalForms.entries().toArray();
  };

  // Form Deadlines

  public shared ({ caller }) func setFormDeadline(formId : Nat, deadline : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can set form deadlines");
    };
    formDeadlines.add(formId, deadline);
    stableFormDeadlines := formDeadlines.entries().toArray();
  };

  public query ({ caller }) func getFormDeadline(formId : Nat) : async ?Text {
    formDeadlines.get(formId);
  };

  public query ({ caller }) func getAllFormDeadlines() : async [(Nat, Text)] {
    formDeadlines.entries().toArray();
  };

  public shared ({ caller }) func removeFormDeadline(formId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can remove form deadlines");
    };
    formDeadlines.remove(formId);
    stableFormDeadlines := formDeadlines.entries().toArray();
  };

  // Form Versions

  public query ({ caller }) func getFormVersion(formId : Nat) : async Nat {
    switch (formVersions.get(formId)) {
      case (?v) v;
      case null 1;
    };
  };

  public query ({ caller }) func getAllFormVersions() : async [(Nat, Nat)] {
    formVersions.entries().toArray();
  };

  // Submission Comments

  public shared ({ caller }) func setSubmissionComment(reportId : Nat, comment : Text, author : Text) : async () {
    let entry : SubmissionComment = { reportId; comment; author; timestamp = Time.now() };
    submissionComments.add(reportId, entry);
    stableSubmissionComments := submissionComments.entries().toArray();
  };

  public query ({ caller }) func getSubmissionComment(reportId : Nat) : async ?SubmissionComment {
    submissionComments.get(reportId);
  };

  public query ({ caller }) func getAllSubmissionComments() : async [SubmissionComment] {
    submissionComments.values().toArray();
  };

  // Activity Log

  public shared ({ caller }) func addActivityLog(action : Text, user : Text) : async () {
    let id = nextActivityLogId;
    let entry : ActivityLogEntry = { id; action; user; timestamp = Time.now() };
    activityLog.add(id, entry);
    stableActivityLog := activityLog.entries().toArray();
    nextActivityLogId += 1;
    stableNextActivityLogId := nextActivityLogId;
  };

  public query ({ caller }) func getActivityLog() : async [ActivityLogEntry] {
    activityLog.values().toList<ActivityLogEntry>().toArray();
  };

  public shared ({ caller }) func clearActivityLog() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Only admins can clear activity log");
    };
    activityLog.clear();
    stableActivityLog := [];
    nextActivityLogId := 0;
    stableNextActivityLogId := 0;
  };

  // Backup

  public query ({ caller }) func getBackupData() : async BackupData {
    {
      departments = departments.values().toList<Department>().toArray();
      departmentHeads = departmentHeads.values().toArray();
      formTemplates = formTemplates.values().toList<FormTemplate>().toArray();
      reports = reports.values().toArray();
      externalForms = externalForms.values().toList<ExternalForm>().toArray();
    };
  };
};
