import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { formatMinutesToDuration, formatMinutesToDecimal } from '@/lib/logical-day';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') || 'xlsx';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    const tasks = await db.task.findMany({
      where,
      include: { project: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const exportRows = tasks.map((task) => ({
      'Date': task.date,
      'Project': task.project?.name || 'Unknown',
      'Task Description': task.description,
      'Duration (H:MM)': formatMinutesToDuration(task.durationMinutes),
      'Duration (Hours)': formatMinutesToDecimal(task.durationMinutes),
      'Status': task.status,
      'Notes': task.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    
    // Set auto column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 18 }, // Project
      { wch: 40 }, // Task Description
      { wch: 15 }, // Duration (H:MM)
      { wch: 16 }, // Duration (Hours)
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Task Log');

    if (formatType === 'csv') {
      const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'buffer' });
      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="remotasks_timesheet_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return new NextResponse(xlsxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="remotasks_timesheet_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Failed to export timesheet' }, { status: 500 });
  }
}
