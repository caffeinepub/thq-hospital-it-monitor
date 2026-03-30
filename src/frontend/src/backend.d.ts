import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Department {
    id: bigint;
    icon: string;
    color: string;
    departmentLabel: string;
    patientCount: bigint;
}
export interface BackupData {
    departments: Array<Department>;
    formTemplates: Array<FormTemplate>;
    departmentHeads: Array<DepartmentHead>;
    externalForms: Array<ExternalForm>;
    reports: Array<Report>;
}
export interface FormTemplate {
    id: bigint;
    title: string;
    fields: Array<string>;
    departmentId: bigint;
}
export interface FieldValue {
    field: string;
    value: string;
}
export interface DepartmentHead {
    pin: string;
    name: string;
    departmentId: bigint;
}
export interface AppConfig {
    tvRefreshRate: bigint;
    departmentName: string;
    hospitalName: string;
}
export interface SubmissionComment {
    author: string;
    comment: string;
    timestamp: bigint;
    reportId: bigint;
}
export interface WaConfig {
    messageFormat: string;
    accessToken: string;
    phoneNumberId: string;
}
export interface Report {
    id: bigint;
    fieldValues: Array<FieldValue>;
    submittedBy: string;
    timestamp: bigint;
    departmentId: bigint;
}
export interface ExternalForm {
    id: bigint;
    title: string;
    platform: string;
    embedUrl: string;
    departmentId: bigint;
}
export interface UserProfile {
    name: string;
}
export interface ActivityLogEntry {
    id: bigint;
    action: string;
    user: string;
    timestamp: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addActivityLog(action: string, user: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearActivityLog(): Promise<void>;
    createDepartment(departmentLabel: string, icon: string, color: string): Promise<bigint>;
    createDepartmentHead(name: string, pin: string, departmentId: bigint): Promise<void>;
    createExternalForm(title: string, platform: string, embedUrl: string, departmentId: bigint): Promise<bigint>;
    createFormTemplate(departmentId: bigint, title: string, fields: Array<string>): Promise<bigint>;
    deleteDepartment(id: bigint): Promise<void>;
    deleteDepartmentHead(pin: string): Promise<void>;
    deleteExternalForm(id: bigint): Promise<void>;
    deleteFormTemplate(id: bigint): Promise<void>;
    getActivityLog(): Promise<Array<ActivityLogEntry>>;
    getAllDepartmentHeads(): Promise<Array<DepartmentHead>>;
    getAllDepartments(): Promise<Array<Department>>;
    getAllExternalForms(): Promise<Array<ExternalForm>>;
    getAllFormDeadlines(): Promise<Array<[bigint, string]>>;
    getAllFormTemplates(): Promise<Array<FormTemplate>>;
    getAllFormVersions(): Promise<Array<[bigint, bigint]>>;
    getAllReports(): Promise<Array<Report>>;
    getAllSubmissionComments(): Promise<Array<SubmissionComment>>;
    getAppConfig(): Promise<AppConfig | null>;
    getBackupData(): Promise<BackupData>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDepartment(id: bigint): Promise<Department | null>;
    getDepartmentHead(pin: string): Promise<DepartmentHead | null>;
    getFormDeadline(formId: bigint): Promise<string | null>;
    getFormTemplate(id: bigint): Promise<FormTemplate | null>;
    getFormVersion(formId: bigint): Promise<bigint>;
    getReport(id: bigint): Promise<Report | null>;
    getReportsByDepartment(departmentId: bigint): Promise<Array<Report>>;
    getSubmissionComment(reportId: bigint): Promise<SubmissionComment | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWaConfig(): Promise<WaConfig>;
    isCallerAdmin(): Promise<boolean>;
    removeFormDeadline(formId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setAppConfig(config: AppConfig): Promise<void>;
    setFormDeadline(formId: bigint, deadline: string): Promise<void>;
    setSubmissionComment(reportId: bigint, comment: string, author: string): Promise<void>;
    setWaConfig(cfg: WaConfig): Promise<void>;
    submitReport(departmentId: bigint, submittedBy: string, fieldValues: Array<FieldValue>): Promise<bigint>;
    updateDepartment(department: Department): Promise<void>;
    updateDepartmentHead(departmentHead: DepartmentHead): Promise<void>;
    updateExternalForm(form: ExternalForm): Promise<void>;
    updateFormTemplate(formTemplate: FormTemplate): Promise<void>;
}
