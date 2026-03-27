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
  // Keep accessControlState to preserve upgrade compatibility with previous version.
  // Authorization is handled by PIN on the frontend; backend is open.
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

  // Stable storage for persistence across upgrades
  stable var stableDepartments : [(Nat, Department)] = [];
  stable var stableDepartmentHeads : [(Text, DepartmentHead)] = [];
  stable var stableFormTemplates : [(Nat, FormTemplate)] = [];
  stable var stableReports : [(Nat, Report)] = [];
  stable var stableNextDepartmentId : Nat = 0;
  stable var stableNextFormTemplateId : Nat = 0;
  stable var stableNextReportId : Nat = 0;
  stable var stableAppConfig : ?AppConfig = null;

  // In-memory maps (rebuilt from stable storage on postupgrade)
  let departments = Map.empty<Nat, Department>();
  let departmentHeads = Map.empty<Text, DepartmentHead>();
  let formTemplates = Map.empty<Nat, FormTemplate>();
  let reports = Map.empty<Nat, Report>();

  var nextDepartmentId = 0;
  var nextFormTemplateId = 0;
  var nextReportId = 0;

  var appConfig : ?AppConfig = null;

  // Upgrade hooks
  system func preupgrade() {
    stableDepartments := departments.entries().toArray();
    stableDepartmentHeads := departmentHeads.entries().toArray();
    stableFormTemplates := formTemplates.entries().toArray();
    stableReports := reports.entries().toArray();
    stableNextDepartmentId := nextDepartmentId;
    stableNextFormTemplateId := nextFormTemplateId;
    stableNextReportId := nextReportId;
    stableAppConfig := appConfig;
  };

  system func postupgrade() {
    for ((k, v) in stableDepartments.vals()) {
      departments.add(k, v);
    };
    for ((k, v) in stableDepartmentHeads.vals()) {
      departmentHeads.add(k, v);
    };
    for ((k, v) in stableFormTemplates.vals()) {
      formTemplates.add(k, v);
    };
    for ((k, v) in stableReports.vals()) {
      reports.add(k, v);
    };
    nextDepartmentId := stableNextDepartmentId;
    nextFormTemplateId := stableNextFormTemplateId;
    nextReportId := stableNextReportId;
    appConfig := stableAppConfig;
  };

  // Departments

  public shared func createDepartment(departmentLabel : Text, icon : Text, color : Text) : async Nat {
    let id = nextDepartmentId;
    let department : Department = { id; departmentLabel; icon; color; patientCount = 0 };
    departments.add(id, department);
    nextDepartmentId += 1;
    id;
  };

  public query func getDepartment(id : Nat) : async ?Department {
    departments.get(id);
  };

  public query func getAllDepartments() : async [Department] {
    departments.values().toList<Department>().sort().toArray();
  };

  public shared func updateDepartment(department : Department) : async () {
    if (not departments.containsKey(department.id)) {
      Runtime.trap("Department not found");
    };
    departments.add(department.id, department);
  };

  public shared func deleteDepartment(id : Nat) : async () {
    if (not departments.containsKey(id)) {
      Runtime.trap("Department not found");
    };
    departments.remove(id);
  };

  // Department Heads / Users

  public shared func createDepartmentHead(name : Text, pin : Text, departmentId : Nat) : async () {
    let departmentHead : DepartmentHead = { name; pin; departmentId };
    departmentHeads.add(pin, departmentHead);
  };

  public query func getDepartmentHead(pin : Text) : async ?DepartmentHead {
    departmentHeads.get(pin);
  };

  public query func getAllDepartmentHeads() : async [DepartmentHead] {
    departmentHeads.values().toArray();
  };

  public shared func updateDepartmentHead(departmentHead : DepartmentHead) : async () {
    if (not departmentHeads.containsKey(departmentHead.pin)) {
      Runtime.trap("Department head not found");
    };
    departmentHeads.add(departmentHead.pin, departmentHead);
  };

  public shared func deleteDepartmentHead(pin : Text) : async () {
    if (not departmentHeads.containsKey(pin)) {
      Runtime.trap("Department head not found");
    };
    departmentHeads.remove(pin);
  };

  // Form Templates

  public shared func createFormTemplate(departmentId : Nat, title : Text, fields : [Text]) : async Nat {
    let id = nextFormTemplateId;
    let formTemplate : FormTemplate = { id; departmentId; title; fields };
    formTemplates.add(id, formTemplate);
    nextFormTemplateId += 1;
    id;
  };

  public query func getAllFormTemplates() : async [FormTemplate] {
    formTemplates.values().toList<FormTemplate>().sort().toArray();
  };

  public query func getFormTemplate(id : Nat) : async ?FormTemplate {
    formTemplates.get(id);
  };

  public shared func updateFormTemplate(formTemplate : FormTemplate) : async () {
    if (not formTemplates.containsKey(formTemplate.id)) {
      Runtime.trap("Form template not found");
    };
    formTemplates.add(formTemplate.id, formTemplate);
  };

  public shared func deleteFormTemplate(id : Nat) : async () {
    if (not formTemplates.containsKey(id)) {
      Runtime.trap("Form template not found");
    };
    formTemplates.remove(id);
  };

  // Reports

  public shared func submitReport(departmentId : Nat, submittedBy : Text, fieldValues : [FieldValue]) : async Nat {
    let id = nextReportId;
    let report : Report = { id; departmentId; submittedBy; timestamp = Time.now(); fieldValues };
    reports.add(id, report);
    nextReportId += 1;
    id;
  };

  public query func getReport(id : Nat) : async ?Report {
    reports.get(id);
  };

  public query func getReportsByDepartment(departmentId : Nat) : async [Report] {
    reports.values().toList<Report>().filter(
      func(report) { report.departmentId == departmentId }
    ).toArray();
  };

  public query func getAllReports() : async [Report] {
    reports.values().toArray();
  };

  // App Config

  public shared func setAppConfig(config : AppConfig) : async () {
    appConfig := ?config;
  };

  public query func getAppConfig() : async ?AppConfig {
    appConfig;
  };
};
