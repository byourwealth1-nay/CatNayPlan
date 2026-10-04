# FP V2.3 — Implementation and verification

อัปเกรดจาก FP-V2.2-GitHub.zip วันที่ 4 ตุลาคม 2569

## ไฟล์แก้ไข

- dist/app.mjs — money controls, questions, collapsible entries, progress, autosave, partial report, unknown handling, printing
- dist/experience.mjs — โมดูลใหม่สำหรับ metadata/format/storage/completeness/allocation
- dist/model.mjs — schema 6 และรับ schema 5/6; ไม่มีการแก้สูตรคำนวณ
- dist/index.html — รุ่น 2.3.0, save status, clear/recovery controls
- dist/style.css — mobile single column, touch targets, wrapping, print
- tests/v2-ui.test.mjs — โหลด helper และตั้ง fixture สำหรับทดสอบ regression เดิม; เพิ่ม event cases จริงผ่าน DOM mock
- tests/v23-experience.test.mjs — tests ใหม่ของ interaction logic/storage/schema/status
- tests/browser-check.cjs — เตรียม Playwright smoke test (ยังรันไม่ผ่านเพราะขาด Chromium)
- tests.mjs — รวมชุดทดสอบใหม่
- README.md, START-HERE.txt, TAX-AUDIT-2569.md, .gitignore — เอกสาร/เวอร์ชัน/ข้อจำกัด

## ผลตรวจ

- PASS: node tests.mjs — ชุดเดิมทั้งหมดและ V2.3
- PASS: node --check ของ app.mjs, experience.mjs, model.mjs และ browser-check.cjs
- PASS: เปรียบเทียบข้อความส่วนสูตร model กับต้นฉบับตรงกัน; diff ของ model มีเฉพาะ VERSION และ decodePlan routing ของ schema
- NOT RUN: desktop/mobile rendering, overflow จริง, native input keyboard, PDF visual QA, Playwright assertions — ไม่สามารถติดตั้ง Chromium ได้
- ไม่ได้เปลี่ยนสูตรภาษีหรืออ้างว่าตรวจภาษี 2569 ใหม่

## ข้อจำกัด

- Local Storage แผนเดียวต่อ origin ไม่ซิงก์ข้ามเครื่อง/หลายแท็บ
- unknown เก็บแยกใน ux; คงตัวเลขเดิมเพื่อไม่ทำข้อมูลหาย แต่ไม่แสดงผลรวมจนยืนยันค่า ไม่คำนวณช่วงความเป็นไปได้
- ช่องเสริมว่างไม่รวมยอด; หน้าไม่ถือว่าครบจนข้อมูลจำเป็นพร้อมและผู้ใช้ทบทวนสมมติฐาน/ช่องเสริม
- schema 6 เปิดด้วย V2.3; รับเข้า schema 1–5 ได้
- ต้องตรวจภาพจริงและการพิมพ์อีกครั้งบนเครื่องที่มี Chromium ก่อนเผยแพร่ให้ลูกค้า
