// состояние приложения
let count = 0;

// получаем элементы DOM
const output = document.getElementById("output");
const incrementBtn = document.getElementById("btn");
const resetBtn = document.getElementById("reset");

// функция обновления интерфейса
function render() {
output.textContent = `Count: ${count}`;
}

// обработчики событий
incrementBtn.addEventListener("click", () => {
count++;
render();
});

resetBtn.addEventListener("click", () => {
    count = 0;
    render();
});

// первый рендер
render();