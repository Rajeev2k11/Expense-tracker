const Category = require('../models/category.model');

const createCategory = async (req, res) => {
    try {
        const { name, description, color } = req.body;
        const category = await Category.create({ name, description, color });
        res.status(201).json({ message: 'Category created successfully', category: category });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create category', error: error.message });
    }
}

const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get category', error: error.message });
    }
}

const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get categories', error: error.message });
    }
}

const updateCategory = async (req, res) => {
    try {
        const { name, description, color } = req.body;
        const Existedcategory = await Category.findById(req.params.id);
        if(!Existedcategory){
            return res.status(404).json({ message: 'Category not found' });
        }
        if(Existedcategory.name === name && Existedcategory.description === description && Existedcategory.color === color){
            return res.status(400).json({ message: 'Category name, description and color are same as existing category' });
        }
        const category = await Category.findByIdAndUpdate(req.params.id, { name, description, color }, { new: true });
        res.status(200).json({ message: 'Category updated successfully', category: category });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update category', error: error.message });
    }
}

const deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete category', error: error.message });
    }
}

module.exports = { createCategory, getCategoryById, getAllCategories, updateCategory, deleteCategory }