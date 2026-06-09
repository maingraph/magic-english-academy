document.addEventListener('DOMContentLoaded', function() {
    // Тестовые данные (можно заменить на свои)
    const testData = [
        {
            question: "She ___ to the store every day.",
            answers: [
                { text: "go", correct: false },
                { text: "goes", correct: true },
                { text: "going", correct: false }
            ]
        },
        {
            question: "They ___ playing football now.",
            answers: [
                { text: "is", correct: false },
                { text: "are", correct: true },
                { text: "am", correct: false }
            ]
        },
        {
            question: "I ___ never been to Paris.",
            answers: [
                { text: "has", correct: false },
                { text: "have", correct: true },
                { text: "had", correct: false }
            ]
        },
        {
            question: "He ___ his homework yesterday.",
            answers: [
                { text: "do", correct: false },
                { text: "did", correct: true },
                { text: "done", correct: false }
            ]
        },
        {
            question: "We ___ a great time last weekend.",
            answers: [
                { text: "have", correct: false },
                { text: "had", correct: true },
                { text: "has", correct: false }
            ]
        },
        {
            question: "___ you like some coffee?",
            answers: [
                { text: "Would", correct: true },
                { text: "Will", correct: false },
                { text: "Do", correct: false }
            ]
        },
        {
            question: "She can ___ very well.",
            answers: [
                { text: "sing", correct: true },
                { text: "sings", correct: false },
                { text: "singing", correct: false }
            ]
        },
        {
            question: "They ___ to London next month.",
            answers: [
                { text: "travel", correct: false },
                { text: "will travel", correct: true },
                { text: "travels", correct: false }
            ]
        },
        {
            question: "This is ___ book I've ever read.",
            answers: [
                { text: "the best", correct: true },
                { text: "the better", correct: false },
                { text: "best", correct: false }
            ]
        },
        {
            question: "If it rains, we ___ at home.",
            answers: [
                { text: "stay", correct: false },
                { text: "will stay", correct: true },
                { text: "stayed", correct: false }
            ]
        }
    ];

    const testQuestionsContainer = document.getElementById('testQuestions');
    const checkAnswersBtn = document.getElementById('checkAnswers');
    const resetTestBtn = document.getElementById('resetTest');
    const testResultsContainer = document.getElementById('testResults');

    // Отображаем вопросы
    function renderQuestions() {
        testQuestionsContainer.innerHTML = '';
        
        testData.forEach((questionData, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.dataset.questionIndex = index;
            
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${questionData.question}`;
            
            const answersContainer = document.createElement('div');
            answersContainer.className = 'answers-container';
            
            questionData.answers.forEach((answer, answerIndex) => {
                const answerId = `q${index}a${answerIndex}`;
                
                const answerElement = document.createElement('label');
                answerElement.className = 'answer-option';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `question-${index}`;
                input.id = answerId;
                input.value = answerIndex;
                
                const answerText = document.createElement('span');
                answerText.textContent = answer.text;
                
                answerElement.appendChild(input);
                answerElement.appendChild(answerText);
                answersContainer.appendChild(answerElement);
            });
            
            questionElement.appendChild(questionText);
            questionElement.appendChild(answersContainer);
            testQuestionsContainer.appendChild(questionElement);
        });
    }

    // Проверяем ответы
    function checkAnswers() {
        let correctAnswers = 0;
        const totalQuestions = testData.length;
        
        testData.forEach((questionData, index) => {
            const questionElement = document.querySelector(`.question-item[data-question-index="${index}"]`);
            const selectedAnswer = questionElement.querySelector('input[type="radio"]:checked');
            
            if (selectedAnswer) {
                const answerIndex = parseInt(selectedAnswer.value);
                const isCorrect = questionData.answers[answerIndex].correct;
                
                if (isCorrect) {
                    correctAnswers++;
                    selectedAnswer.parentElement.classList.add('correct-answer');
                } else {
                    selectedAnswer.parentElement.classList.add('wrong-answer');
                    // Показываем правильный ответ
                    const correctAnswerIndex = questionData.answers.findIndex(a => a.correct);
                    const correctAnswerElement = questionElement.querySelectorAll('.answer-option')[correctAnswerIndex];
                    correctAnswerElement.classList.add('show-correct');
                }
            } else {
                // Если ответ не выбран, показываем правильный
                const correctAnswerIndex = questionData.answers.findIndex(a => a.correct);
                const correctAnswerElement = questionElement.querySelectorAll('.answer-option')[correctAnswerIndex];
                correctAnswerElement.classList.add('show-correct');
            }
            
            // Делаем все радио-кнопки неактивными после проверки
            questionElement.querySelectorAll('input[type="radio"]').forEach(input => {
                input.disabled = true;
            });
        });
        
        // Показываем результаты
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);
        testResultsContainer.innerHTML = `
            <p>Вы ответили правильно на ${correctAnswers} из ${totalQuestions} вопросов.</p>
            <p>Результат: ${percentage}%</p>
            ${percentage >= 80 ? '<p style="color: green;">Отличный результат!</p>' : 
            percentage >= 50 ? '<p style="color: orange;">Хороший результат, но можно лучше!</p>' : 
            '<p style="color: red;">Попробуйте еще раз!</p>'}
        `;
        testResultsContainer.style.display = 'block';
        
        // Прокручиваем к результатам
        testResultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Сбрасываем тест
    function resetTest() {
        renderQuestions();
        testResultsContainer.style.display = 'none';
        testResultsContainer.innerHTML = '';
    }

    // Инициализация
    renderQuestions();
    
    // Обработчики событий
    checkAnswersBtn.addEventListener('click', checkAnswers);
    resetTestBtn.addEventListener('click', resetTest);
});