const express = require('express');
const router = express.Router();
const KneeData = require('../models/KneeData');
const auth = require('../middleware/auth');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Save IoT knee data
router.post('/save', auth, async (req, res) => {
  try {
    const {
      deviceId,
      kneeAngle,
      temperature,
      flexRaw,
      status,
      deviceInfo,
      sessionInfo
    } = req.body;

    // Validate required fields
    if (!deviceId || kneeAngle === undefined || temperature === undefined || flexRaw === undefined || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create new knee data entry
    const kneeData = new KneeData({
      userId: req.user.id,
      deviceId,
      kneeAngle,
      temperature,
      flexRaw,
      status,
      deviceInfo,
      sessionInfo
    });

    await kneeData.save();

    res.status(201).json({
      message: 'Knee data saved successfully',
      data: kneeData
    });
  } catch (error) {
    console.error('Error saving knee data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's knee data with pagination
router.get('/my-data', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filter options
    const filters = {
      userId: req.user.id
    };

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.deviceId) {
      filters.deviceId = req.query.deviceId;
    }

    if (req.query.startDate || req.query.endDate) {
      filters.timestamp = {};
      if (req.query.startDate) {
        filters.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filters.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    // Get data with pagination
    const kneeData = await KneeData.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await KneeData.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: kneeData,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching knee data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get knee data statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const timeRange = req.query.timeRange || '30'; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    const stats = await KneeData.aggregate([
      {
        $match: {
          userId: userId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalMeasurements: { $sum: 1 },
          avgKneeAngle: { $avg: '$kneeAngle' },
          avgTemperature: { $avg: '$temperature' },
          maxKneeAngle: { $max: '$kneeAngle' },
          minKneeAngle: { $min: '$kneeAngle' },
          maxTemperature: { $max: '$temperature' },
          minTemperature: { $min: '$temperature' },
          statusBreakdown: {
            $push: '$status'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        totalMeasurements: 0,
        avgKneeAngle: 0,
        avgTemperature: 0,
        maxKneeAngle: 0,
        minKneeAngle: 0,
        maxTemperature: 0,
        minTemperature: 0,
        statusBreakdown: {}
      });
    }

    const result = stats[0];
    
    // Count status occurrences
    const statusBreakdown = {};
    result.statusBreakdown.forEach(status => {
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    res.json({
      ...result,
      statusBreakdown
    });
  } catch (error) {
    console.error('Error fetching knee data stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download knee data as CSV
router.get('/download/csv', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, deviceId } = req.query;

    const filters = { userId };
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }
    if (deviceId) filters.deviceId = deviceId;

    const kneeData = await KneeData.find(filters).sort({ timestamp: -1 });

    const csvData = kneeData.map(record => ({
      'Timestamp': record.timestamp.toLocaleString(),
      'Device ID': record.deviceId,
      'Knee Angle (°)': record.kneeAngle,
      'Temperature (°C)': record.temperature,
      'Flex Raw': record.flexRaw,
      'Status': record.status,
      'Device IP': record.deviceInfo?.deviceIp || 'N/A',
      'WiFi Connected': record.deviceInfo?.wifiConnected ? 'Yes' : 'No'
    }));

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=knee-data-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download knee data as PDF
router.get('/download/pdf', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, deviceId } = req.query;

    const filters = { userId };
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }
    if (deviceId) filters.deviceId = deviceId;

    const kneeData = await KneeData.find(filters).sort({ timestamp: -1 });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=knee-data-${new Date().toISOString().split('T')[0]}.pdf`);

    // Add content to PDF
    doc.fontSize(20).text('Knee Data Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Total Measurements: ${kneeData.length}`);
    if (startDate) doc.text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}`);
    doc.moveDown();

    // Add table headers
    doc.fontSize(10).text('Timestamp\t\tDevice ID\t\tKnee Angle\tTemperature\tStatus');
    doc.text('--------------------------------------------------------------------');

    // Add data rows
    kneeData.forEach(record => {
      doc.text(
        `${record.timestamp.toLocaleString()}\t${record.deviceId}\t${record.kneeAngle}°\t${record.temperature}°C\t${record.status}`
      );
    });

    doc.end();
    doc.pipe(res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete knee data
router.delete('/:id', auth, async (req, res) => {
  try {
    const kneeData = await KneeData.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!kneeData) {
      return res.status(404).json({ message: 'Knee data not found' });
    }

    res.json({ message: 'Knee data deleted successfully' });
  } catch (error) {
    console.error('Error deleting knee data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get device list for user
router.get('/devices', auth, async (req, res) => {
  try {
    const devices = await KneeData.distinct('deviceId', { userId: req.user.id });
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
