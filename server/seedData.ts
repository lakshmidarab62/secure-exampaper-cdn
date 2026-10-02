import { Student, Faculty, ExamPaper } from './db.js';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: "std_1790914964487_80ov",
    reg_number: "99240040443",
    name: "Jyoshna",
    email: "99240040443@klu.ac.in",
    department: "Computer Science",
    semester: "5",
    section: "24S05",
    academic_year: "2026-2027",
    password_hash: "$2b$10$PKysI/I.ySVaOWw.drtCv.IewFuaD./1PKY9aQ8IjCFvwz8gp0i4C",
    created_at: "2026-10-02T04:22:44.586Z",
    updated_at: "2026-10-02T04:22:44.586Z"
  }
];

export const INITIAL_FACULTY: Faculty[] = [
  {
    id: "fac_1790914601666_gwkq",
    faculty_id: "FAC-CSE-118",
    name: "Dr.Rama Krishna",
    email: "ramakrishna@klu.ac.in",
    department: "Computer Science",
    designation: "Associate Professor",
    role: "faculty",
    password_hash: "$2b$10$lOOwu0PuD7AEwSXc0nlkz.NVZUIDjsKzc4nK/wYJGI/u4WqWaIxDG",
    created_at: "2026-10-02T04:16:41.781Z",
    updated_at: "2026-10-02T04:16:41.781Z"
  }
];

export const INITIAL_PAPERS: ExamPaper[] = [
  {
    id: "paper_1790915052365_yllsn",
    title: "Distributed Cloud Architecture",
    subject: "Distributed Cloud Architecture",
    department: "Computer Science",
    semester: "6",
    section: "A",
    exam_type: "Midterm Examination",
    exam_date: "2026-10-02",
    release_time: "2026-10-02T04:24:11.359Z",
    expiry_time: "2026-10-02T08:24:12.359Z",
    file_path: "Distributed_Cloud_Architecture_Computer_Science_Sem6_SecA.pdf",
    file_name: "Distributed_Cloud_Architecture_Computer_Science_Sem6_SecA.pdf",
    file_size: 2581,
    mime_type: "application/pdf",
    file_hash: "69e6fac44136c1277ed3bfa6a39e39b4aba64d8dc9e37cb8e55ec51b92f952a4",
    uploaded_by: "fac_1790914601666_gwkq",
    uploaded_by_name: "Dr.Rama Krishna",
    status: "published",
    is_student_specific: false,
    page_count: 1,
    instructions: [
      "Answer all questions in sequential order.",
      "State all assumptions clearly for system design questions.",
      "Calculators are permitted for performance equations."
    ],
    questions: [
      {
        qNo: "1",
        text: "Explain the CAP Theorem and discuss how modern distributed data stores balance consistency vs availability.",
        marks: 20
      },
      {
        qNo: "2",
        text: "Design a high-throughput edge CDN caching strategy for distributing large static examination payloads under flash crowds.",
        marks: 25
      },
      {
        qNo: "3",
        text: "Analyze request queueing algorithms (FIFO vs Leaky Bucket) for preventing origin server resource exhaustion.",
        marks: 25
      },
      {
        qNo: "4",
        text: "Derive the p95 and p99 response time model for a distributed microservice topology with 5 dependent RPC hops.",
        marks: 30
      }
    ],
    duration: "3 Hours",
    max_marks: 100,
    created_at: "2026-10-02T04:24:12.365Z",
    updated_at: "2026-10-02T04:24:12.365Z"
  },
  {
    id: "paper_1790915052370_hwjn3",
    title: "Database Systems & Query Optimization",
    subject: "Database Systems & Query Optimization",
    department: "Information Technology",
    semester: "4",
    section: "CSE-B",
    exam_type: "End-Semester Examination",
    exam_date: "2026-10-02",
    release_time: "2026-10-02T04:24:11.359Z",
    expiry_time: "2026-10-02T08:24:12.359Z",
    file_path: "Database_Systems___Query_Optimization_Information_Technology_Sem4_SecCSE-B.pdf",
    file_name: "Database_Systems___Query_Optimization_Information_Technology_Sem4_SecCSE-B.pdf",
    file_size: 2503,
    mime_type: "application/pdf",
    file_hash: "770c12b71929486740d2283937f7603ba9470504ccf7bf18cd1b592f8cee073e",
    uploaded_by: "fac_1790914601666_gwkq",
    uploaded_by_name: "Dr.Rama Krishna",
    status: "published",
    is_student_specific: false,
    page_count: 1,
    instructions: [
      "Write clean SQL queries with proper formatting.",
      "Draw relational schema diagrams where appropriate.",
      "All answers must be legible."
    ],
    questions: [
      {
        qNo: "1",
        text: "Differentiate between B+ Trees and LSM Trees for write-heavy vs read-heavy database architectures.",
        marks: 25
      },
      {
        qNo: "2",
        text: "Explain Two-Phase Locking (2PL) and Multi-Version Concurrency Control (MVCC) with isolation level guarantees.",
        marks: 25
      },
      {
        qNo: "3",
        text: "Write queries demonstrating recursive CTEs and window functions for calculating cumulative student performance.",
        marks: 25
      },
      {
        qNo: "4",
        text: "Analyze cost-based query optimizer plans using index scans vs sequential scans with filter predicates.",
        marks: 25
      }
    ],
    duration: "3 Hours",
    max_marks: 100,
    created_at: "2026-10-02T04:24:12.370Z",
    updated_at: "2026-10-02T04:24:12.370Z"
  }
];
