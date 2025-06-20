const express = require('express');
const { ref, get, update, remove, set, push } = require('firebase/database');
const database = require('../dbConnect');

const cjenikRouter = express.Router();

cjenikRouter.get('/', async (req, res) => {
  try {
    const reference = ref(database, 'Cjenik');
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send('No data available in Firebase');
    }
  } catch (error) {
    console.error('Error fetching data from Firebase:', error);
    res.status(500).send('Failed to fetch data from Firebase');
  }
});

cjenikRouter.get('/posebno', async (req, res) => {
  try {
    const reference = ref(database, `Cjenik/Posebno`);
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send(`No item found in Cjenik with title: posebno`);
    }
  } catch (error) {
    console.error('Error fetching item from Firebase:', error);
    res.status(500).send('Failed to fetch item from Firebase');
  }
});

cjenikRouter.get('/pice', async (req, res) => {
  try {
    const reference = ref(database, `Cjenik/Pice`);
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send(`No item found in Cjenik with title: pice`);
    }
  } catch (error) {
    console.error('Error fetching item from Firebase:', error);
    res.status(500).send('Failed to fetch item from Firebase');
  }
});

cjenikRouter.get('/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const reference = ref(database, `Cjenik/${title}`);
    const snapshot = await get(reference);

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send(`No item found in Cjenik with title: ${title}`);
    }
  } catch (error) {
    console.error('Error fetching item from Firebase:', error);
    res.status(500).send('Failed to fetch item from Firebase');
  }
});

cjenikRouter.get('/:title/:id', async (req, res) => {
  try {
    const { title, id } = req.params;
    console.log('Fetching item with title:', title, 'and id:', id);
    const reference = ref(database, `Cjenik/${title}/${id}`);
    const snapshot = await get(reference);
    console.log('Snapshot:', snapshot.val());

    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).send(`No item found in Cjenik with title: ${title}`);
    }
  } catch (error) {
    console.error('Error fetching item from Firebase:', error);
    res.status(500).send('Failed to fetch item from Firebase');
  }
});

cjenikRouter.delete('/:title/:id', async (req, res) => {
  try {
    const { title, id } = req.params;
    console.log('Deleting item with title:', title, 'and id:', id);
    const reference = ref(database, `Cjenik/${title}/${id}`);
    
    await remove(reference);
    console.log('Item deleted successfully');

    res.send(`Item with ID: ${id} in Cjenik/${title} deleted successfully`);
  } catch (error) {
    console.error('Error deleting item from Firebase:', error);
    res.status(500).send('Failed to delete item from Firebase');
  }
});

cjenikRouter.put('/:title/:id', async (req, res) => {
  try {
    const { title, id } = req.params;
    const updatedMeal = req.body;

    console.log('Updating item with title:', title, 'and id:', id);
    console.log('New data:', updatedMeal);

    const reference = ref(database, `Cjenik/${title}/${id}`);
    await set(reference, updatedMeal);

    res.json({ message: "Meal updated successfully", data: updatedMeal });
  } catch (error) {
    console.error('Error updating meal in Firebase:', error);
    res.status(500).send('Failed to update meal in Firebase');
  }
});




cjenikRouter.post('/updatePopularity', async (req, res) => {
  const meals = req.body; // Don't destructure, just take it as an array
  console.log('Updating popularity for:', meals);
  try {
    const reference = ref(database, 'Cjenik');
    const snapshot = await get(reference);

    if (!snapshot.exists()) {
      return res.status(404).send('No data available in Firebase');
    }

    const categories = snapshot.val();

    for (const meal of meals) {
      for (const category in categories) {
        if (category === 'Prilozi') continue;
        for (const id in categories[category]) {
          if (id === meal.id) {
            console.log(`Found meal with ID: ${id} in category: ${category}`);
            const mealRef = ref(database, `Cjenik/${category}/${id}`);
            console.log(`Meal reference: ${mealRef}`);
            console.log(`Current popularity: ${categories[category][id].popularity}`);
            //increment popularity
            await update(mealRef, { popularity: categories[category][id].popularity + 1 });
            console.log(`Updated popularity from ${categories[category][id].popularity} to ${categories[category][id].popularity + 1} for ${meal.name}`);
            break;
          }
        }
      }
    }

    
    res.status(200).json({ message: `Updated popularity for ${meals.length} items` });
  }
  catch (error) {
    console.error('Error updating popularity:', error);
    res.status(500).send('Failed to update popularity');
  }
}
);

cjenikRouter.post('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const newMeal = req.body;

    console.log('Adding new meal to category:', category);
    console.log('Meal data:', newMeal);

    const categoryRef = ref(database, `Cjenik/${category}`);
    const newMealRef = push(categoryRef); // Generira novi ključ u Firebaseu

    await set(newMealRef, newMeal);

    res.json({ message: "Meal added successfully", id: newMealRef.key, data: newMeal });
  } catch (error) {
    console.error('Error adding meal to Firebase:', error);
    res.status(500).send('Failed to add meal to Firebase');
  }
});

module.exports = cjenikRouter;
