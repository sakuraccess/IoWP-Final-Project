# IoWP-Final-Project

## Project 2: Statistic Portal

This project focuses on the development of an interactive data visualization web application that allows users to explore and analyze population data (by category) and employment rate data for different cities in Finland. The primary goal is to create a user-friendly interface for visualizing data through maps and charts.

---

### Tools Used

- **Frappe Charts**: Utilized for creating interactive and visually appealing charts that effectively represent the data.
- **Leaflet**: Used for rendering interactive maps in the web application, providing mapping capabilities for exploring geographic data.

---

### User Guide and Page Explanations

#### A. Main Page - Specific Population Data and Chart View (index.html)
1. To access the main page, open the `index.html` or visit the following link: [IoWP-Final-Project Main Page](https://sakuraccess.github.io/IoWP-Final-Project/).

2.	On the main page, follow the instructions to select the desired demographic data category. Click the `Fetch selected data` button to get *Population by region, main activity type, gender, age and year* data for the whole of Finland or for a specific municipality. Data span 1987 to 2021. The acquired data will be displayed in the *Obtained data list*. Click the `Clear List` button to clear the list.

3.	Drag one of the obtained data in the list to `Apply chart view` or `Apply map view` to display chart view and map view (go to map.html). respectively. In chart view, you can also click the `Download Image` button to save the map as an SVG image file.

4.	You can further explore the `Go to National Employment Rate Distribution Map` button and switch to the National Employment Rate Distribution Map. 

#### B. Specific Population Data Page - National Map View (map.html)
1. Start by selecting the desired year according to the provided instructions.
2. On the map, you can click and drag to access information about a specific municipality. Relevant details will be displayed in a popup window.
3. If you already know the name of a specific municipality, you can enter it in the search box. The map will automatically locate and display information about the specified municipality.
4. Whether using the map's drag-and-click feature or the search function, the popup window will include a `Chart view for this municipality` button. Clicking this button will take you back to the main page to view additional data for that municipality. The municipality's name will be automatically filled in the search box on the main page for convenient access to additional data.
5. Use the `Go back to the main page` button at the top of the map to return to the main page.

The usage of the National Employment Rate Distribution Map (emp.html) is similar to the Specific Population Data Page, National Map View, allowing you to explore information by dragging on the map or using the search function.

---

Enjoy exploring the data and visualizations in this project!
