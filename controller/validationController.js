import { llm } from "../services/llmService.js";
import { _fetchMaterialById } from "./materialController.js";
import { htmlToText } from "../services/ragStore.js";

export const validateAnswers = async (req, res, next) => {
  try {
    const { quizId, answers, questions, finishedAt } = req.body;

    if (!quizId || !answers || !questions) {
      return res.status(400).json({
        status: 'fail',
        message: 'QuizId, answers, and questions are required',
      });
    }

    const material = await _fetchMaterialById(quizId);
    if (!material?.content) {
      return res.status(404).json({
        message: "Material not found"
      });
    }

    const materialText = htmlToText(material.content);

    const validationResult = await validateStudentAnswers(
      answers, 
      questions, 
      materialText, 
      quizId, 
      finishedAt
    );

    return res.json(validationResult);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: `Validation error: ${error.message}`,
    });
  }
};

const validateAnswerWithAI = async (question, studentAnswer, correctAnswer, materialText) => {
  const systemPrompt = `Anda adalah asisten penilai edukasi. Tugas Anda:

**MATERI**: ${materialText}

**SOAL**: "${question}"
**JAWABAN SISWA**: "${studentAnswer}"
**KUNCI JAWABAN**: "${correctAnswer}"

**TUGAS**: Tentukan apakah jawaban siswa BENAR atau SALAH berdasarkan materi.
Perhatikan MAKNA dan ESENSI, bukan hanya kata-per-kata.

**ATURAN**:
- Jawaban sinonim yang benar = BENAR
- Jawaban yang secara konsep sesuai = BENAR  
- Jawaban yang salah atau misleading = SALAH

**Output**: Hanya "BENAR" atau "SALAH"`;

  try {
    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Apakah jawaban siswa benar? Jawab hanya 'BENAR' atau 'SALAH':" }
    ]);

    const raw = response?.kwargs?.content || response?.content || response?.text || "";
    const answer = raw.trim().toUpperCase();
    
    return answer.includes("BENAR");

  } catch (error) {
    console.error("AI Validation Error:", error);
    // Fallback ke basic matching jika AI error
    return studentAnswer.toString().trim().toLowerCase() === correctAnswer.toString().trim().toLowerCase();
  }
};


//validasi jawaban 
const validateStudentAnswers = async (studentAnswers, questions, materialText, quizId, finishedAt) => {
  let correctCount = 0;
  let unansweredCount = 0;

  for (const studentAnswer of studentAnswers) {
    const questionId = studentAnswer.questionId;
    const studentAnswerText = studentAnswer.answer;

    const question = questions.find(q => q.id == questionId);
    
    if (!question) continue;

    if (studentAnswerText === null || studentAnswerText === undefined || studentAnswerText === "") {
      unansweredCount++;
      continue;
    }

    const isCorrect = await validateAnswerWithAI(
      question.question,
      studentAnswerText,
      question.correct_answer,
      materialText
    );

    if (isCorrect) {
      correctCount++;
    }
  }

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

const resultStore = {};

export const storeResult = async (req, res) => {
  try {
    const { learningId, scoreStats, finishedAt } = req.body;

    if (!learningId || !scoreStats || typeof scoreStats.avarageScore !== 'number') {
      return res.status(400).json({
        status: 'fail',
        message: 'Incomplete or invalid data input',
      });
    }

    const dataToStore = {
      scoreStats,
      finishedAt,
      storedAt: new Date().toISOString(),
    };

    resultStore[learningId] = dataToStore;

    return res.status(200).json({
      status: 'success',
      message: 'Final score successfully saved',
      learningId: learningId,
    });
  } catch (error) {
    return res.status.json({
      status: 'error',
      message: error.message,
    });
  }
}

export const updateProgress = async (req, res) => {
  try {
    const { learningId, status, lastActivity } = req.body;

    if (!learningId || !status) {
      return res.status(400).json({
        status: 'fail',
        message: 'Learning id and status are requried',
      });
    }

    const currentData = resultStore[learningId] || {};
    currentData.status = status;
    currentData.lastActivity = lastActivity || new Date().toISOString();

    resultStore[learningId] = currentData;

    return res.status(200).json({
      status: 'success',
      message: `Progress successfully updated to status: ${status}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
}

export const getProgress = async (req, res) => {
  try {
    const { learningId } = req.params;

    const data = resultStore[learningId];

    if (!data) {
      return res.status(404).json({
        status: 'fail',
        message: 'Progress not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        learningId: learningId,
        scoreStats: data.scoreStats,
        status: data.status,
        lastActivity: data.lastActivity,
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
}