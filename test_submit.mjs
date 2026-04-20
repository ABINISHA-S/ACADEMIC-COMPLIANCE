const run = async () => {
  const res = await fetch('http://localhost:3000/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignmentId: 'testA',
      studentId: 'student1',
      studentName: 'Student',
      content: 'Hello World',
      fileName: 'test.txt',
      fileData: 'data:text/plain;base64,aGVsbG8gd29ybGQ=',
      status: 'PENDING',
      submittedAt: Date.now(),
      version: 1,
    }),
  });
  console.log(res.status, await res.text());
};
run();
