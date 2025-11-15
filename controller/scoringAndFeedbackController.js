import { llm } from "../services/llmService.js";
import { _fetchMaterialById } from "./materialController.js";
import { htmlToText } from "../services/ragStore.js";

// Temporary storage
const questionStore = new Map();

//fungsi untuk menyimpan soal yang sudah digenerate
export const storeQuestions = (quizId, questions, materialId) => {
  if (!quizId || !questions) {
    throw new Error("QuizId and questions are required");
  }

  questionStore.set(quizId, {
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      options: q.options
    })),
    materialId: materialId,
    createdAt: new Date().toISOString()
  });
};

//validasi jawaban menggunakan AI
export const validateAnswers = async (req, res, next) => {
  try {
    const { quizId, answers, finishedAt } = req.body;

    const quizData = questionStore.get(quizId);
    
    if (!quizData) {
      return res.status(404).json({
        message: "Quiz not found, make sure the questions have been generated"
      });
    }

    const material = await _fetchMaterialById(quizData.materialId);
    if (!material?.content) {
      return res.status(404).json({
        message: "Material not found"
      });
    }

    const materialText = htmlToText(material.content);

    const validationResult = await validateStudentAnswers(
      answers, 
      quizData.questions, 
      materialText, 
      quizId, 
      finishedAt
    );

    return res.json(validationResult);

  } catch (error) {
    next(error);
  }
};

//validasi jawaban 
const validateStudentAnswers = async (studentAnswers, questions, materialText, quizId, finishedAt) => {
  let correctCount = 0;
  let unansweredCount = 0;

  studentAnswers.forEach(studentAnswer => {
    const questionId = studentAnswer.questionId;
    const studentAnswerText = studentAnswer.answer;
    
    const question = questions.find(q => q.id == questionId);
    
    if (!question) return;

    if (studentAnswerText === null || studentAnswerText === undefined || studentAnswerText === "") {
      unansweredCount++;
      return;
    }
    if (studentAnswerText.toString().trim().toLowerCase() === 
        question.correct_answer.toString().trim().toLowerCase()) {
      correctCount++;
    }
  });

  //menghitung stats
  const totalQuestions = questions.length;
  const incorrectCount = totalQuestions - correctCount - unansweredCount;
  const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  //generate AI feedback 
  const overallFeedback = await generateFeedback(
    studentAnswers,
    questions,
    materialText,
    scorePercentage,
    correctCount,
    totalQuestions
  );

  return {
    quizId,
    answers: studentAnswers,
    stats: {
      total: totalQuestions,
      correct: correctCount,
      incorrect: incorrectCount,
      unanswered: unansweredCount,
      percentage: Math.round(scorePercentage)
    },
    finishedAt: finishedAt || new Date().toISOString(),
    feedback: overallFeedback
  };
};

const generateFeedback = async (studentAnswers, questions, materialText, score, correctCount, totalQuestions) => {
  const systemPrompt = `Anda adalah mentor edukasi yang berpengalaman. Analisis hasil quiz siswa dan berikan feedback yang spesifik berdasarkan materi pembelajaran.

**MATERI PEMBELAJARAN**:
${materialText}

**SOAL DAN JAWABAN SISWA**:
${JSON.stringify(studentAnswers.map(sa => {
  const question = questions.find(q => q.id == sa.questionId);
  return {
    question: question?.question || "Unknown",
    studentAnswer: sa.answer,
    correctAnswer: question?.correct_answer || "Unknown"
  };
}), null, 2)}

**HASIL**: ${correctCount} dari ${totalQuestions} benar (${Math.round(score)}%)

**TUGAS ANDA**:
1. Analisis jawaban siswa berdasarkan materi yang diberikan
2. Identifikasi area yang sudah dikuasai dan yang perlu perbaikan
3. Beri saran belajar spesifik dengan merujuk ke bagian materi yang relevan
4. Berikan motivasi yang konstruktif

**ATURAN**:
- Feedback harus relevan dengan materi yang diberikan
- Jangan membuat informasi di luar materi
- Fokus pada konsep-konsep penting dari materi
- Gunakan bahasa Indonesia yang jelas dan edukatif

**Keluarkan HANYA string feedback (4-5 kalimat) tanpa format JSON atau markdown.**`;

  try {
    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Berikan feedback yang relevan dengan materi untuk siswa ini." }
    ]);

    const raw = response?.kwargs?.content || response?.content || response?.text || "";
    return raw.trim() || generateFallbackFeedback(score, correctCount, totalQuestions);

  } catch (error) {
    console.error("AI Overall Feedback Error:", error);
    return generateFallbackFeedback(score, correctCount, totalQuestions);
  }
};

//fallback feedback
const generateFallbackFeedback = (score, correctCount, totalQuestions) => {
  if (score >= 90) {
    return `Sangat baik! Anda telah menguasai materi dengan excellent, menjawab ${correctCount} dari ${totalQuestions} soal dengan benar. Pertahankan pemahaman Anda!`;
  } else if (score >= 70) {
    return `Bagus! Pemahaman Anda sudah baik dengan ${correctCount} jawaban benar dari ${totalQuestions} soal. Terus tingkatkan pemahaman konsep-konsep kunci.`;
  } else if (score >= 50) {
    return `Cukup baik. Anda menjawab ${correctCount} dari ${totalQuestions} soal dengan benar. Disarankan untuk mempelajari kembali materi untuk memperdalam pemahaman.`;
  } else {
    return `Perlu peningkatan. Dengan ${correctCount} jawaban benar dari ${totalQuestions} soal, disarankan untuk mempelajari ulang materi secara menyeluruh untuk memahami konsep dasar dengan lebih baik.`;
  }
};

export const getQuizData = (req, res, next) => {
  try {
    const { quizId } = req.params;
    
    const quizData = questionStore.get(quizId);
    
    if (!quizData) {
      return res.status(404).json({
        message: "Quiz not found"
      });
    }

    return res.json({
      quizId: quizId,
      questions: quizData.questions,
      createdAt: quizData.createdAt
    });
  } catch (error) {
    next(error);
  }
};