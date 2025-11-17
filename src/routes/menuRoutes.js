import express from 'express';
import { menuService } from '../services/menuService.js';

const router = express.Router();

// Menu routes
router.get('/menus', async (req, res) => {
  try {
    const menus = await menuService.getAllMenus();
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/menus/:id', async (req, res) => {
  try {
    const menu = await menuService.getMenuById(parseInt(req.params.id));
    if (!menu) return res.status(404).json({ error: 'Menu not found' });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/menus', async (req, res) => {
  try {
    const menu = await menuService.createMenu(req.body);
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/menus/:id', async (req, res) => {
  try {
    const menu = await menuService.updateMenu(parseInt(req.params.id), req.body);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/menus/:id', async (req, res) => {
  try {
    await menuService.deleteMenu(parseInt(req.params.id));
    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submenu routes
router.post('/menus/:menuId/submenus', async (req, res) => {
  try {
    const submenu = await menuService.createSubmenu(parseInt(req.params.menuId), req.body);
    res.status(201).json(submenu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/menus/:menuId/submenus', async (req, res) => {
  try {
    const submenus = await menuService.getSubmenusByMenuId(parseInt(req.params.menuId));
    res.json(submenus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/submenus/:id', async (req, res) => {
  try {
    const submenu = await menuService.updateSubmenu(parseInt(req.params.id), req.body);
    res.json(submenu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/submenus/:id', async (req, res) => {
  try {
    await menuService.deleteSubmenu(parseInt(req.params.id));
    res.json({ message: 'Submenu deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;