document.addEventListener('DOMContentLoaded', () => {
    const courseTitleInput = document.getElementById('course-title');
    const courseInstructorInput = document.getElementById('course-instructor');
    const addCourseBtn = document.getElementById('add-course-btn');
    const courseList = document.getElementById('course-list');

    addCourseBtn.addEventListener('click', addCourse);

    function addCourse() {
        const title = courseTitleInput.value.trim();
        const instructor = courseInstructorInput.value.trim();

        if (title === '' || instructor === '') {
            alert('Please enter both course title and instructor.');
            return;
        }

        const listItem = document.createElement('li');

        const courseInfoDiv = document.createElement('div');
        courseInfoDiv.classList.add('course-info');

        const titleSpan = document.createElement('span');
        titleSpan.classList.add('course-title');
        titleSpan.textContent = title;

        const instructorSpan = document.createElement('span');
        instructorSpan.classList.add('course-instructor');
        instructorSpan.textContent = `Instructor: ${instructor}`;

        courseInfoDiv.appendChild(titleSpan);
        courseInfoDiv.appendChild(instructorSpan);
        listItem.appendChild(courseInfoDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            courseList.removeChild(listItem);
        });
        listItem.appendChild(deleteBtn);

        courseList.appendChild(listItem);

        courseTitleInput.value = '';
        courseInstructorInput.value = '';
    }
});