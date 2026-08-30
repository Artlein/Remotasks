import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db, seedInitialDataIfNeeded } from '@/lib/db';
import { parseDurationToMinutes, getLogicalDate } from '@/lib/logical-day';

export async function POST(request: Request) {
  try {
    await seedInitialDataIfNeeded();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read Excel workbook using XLSX
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    
    // Pick sheet: preference for "Task Log" sheet, else first sheet
    const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('task log')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json({ error: 'No sheets found in workbook' }, { status: 400 });
    }

    // Convert sheet to JSON rows
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'Workbook sheet is empty' }, { status: 400 });
    }

    // Fetch existing projects map (case-insensitive name -> id)
    const existingProjects = await db.project.findMany();
    const projectMap = new Map<string, string>();
    for (const p of existingProjects) {
      projectMap.set(p.name.toLowerCase(), p.id);
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rawRows) {
      // Look for columns: Date, Project, Task Description / Description, Duration, Status, Notes
      const dateVal = row['Date'] || row['date'] || row['DATE'] || row['Work Date'];
      const projVal = row['Project'] || row['project'] || row['PROJECT'] || row['Project Name'];
      const descVal = row['Task Description'] || row['Description'] || row['description'] || row['Task'] || row['Details'];
      const durVal = row['Duration'] || row['duration'] || row['Duration (Hours)'] || row['Hours'] || row['Time'];
      const statusVal = row['Status'] || row['status'] || row['STATUS'] || 'Done';
      const notesVal = row['Notes'] || row['notes'] || row['NOTES'] || row['Comments'] || '';

      if (!projVal || (!durVal && durVal !== 0)) {
        skippedCount++;
        continue;
      }

      // Parse Date
      let formattedDate = getLogicalDate(new Date(), 0);
      if (dateVal) {
        if (dateVal instanceof Date) {
          formattedDate = getLogicalDate(dateVal, 0);
        } else if (typeof dateVal === 'string' && dateVal.trim()) {
          formattedDate = getLogicalDate(new Date(dateVal), 0);
        } else if (typeof dateVal === 'number') {
          // Excel serial date
          const dateObj = XLSX.SSF.parse_date_code(dateVal);
          if (dateObj) {
            const d = new Date(Date.UTC(dateObj.y, dateObj.m - 1, dateObj.d));
            formattedDate = getLogicalDate(d, 0);
          }
        }
      }

      // Parse Project
      const projNameStr = String(projVal).trim();
      let projectId = projectMap.get(projNameStr.toLowerCase());

      if (!projectId) {
        // Create project dynamically if not exists
        const newProj = await db.project.create({
          data: { name: projNameStr, active: true },
        });
        projectId = newProj.id;
        projectMap.set(projNameStr.toLowerCase(), newProj.id);
      }

      // Parse Description (handle broken formula string like __xludf.DUMMYFUNCTION)
      let description = String(descVal || '').trim();
      if (description.includes('__xludf') || description.startsWith('=')) {
        description = `Task (${projNameStr})`;
      }
      if (!description) {
        description = `Task (${projNameStr})`;
      }

      // Parse Duration
      let durationMinutes = 0;
      if (typeof durVal === 'number') {
        // If decimal like 1.5 -> 90 minutes. If > 24, might be raw minutes
        if (durVal <= 24) {
          durationMinutes = Math.round(durVal * 60);
        } else {
          durationMinutes = Math.round(durVal);
        }
      } else {
        durationMinutes = parseDurationToMinutes(String(durVal));
      }

      if (durationMinutes <= 0) {
        skippedCount++;
        continue;
      }

      // Parse Status
      let status = 'Done';
      const cleanStatus = String(statusVal).trim().toLowerCase();
      if (cleanStatus.includes('review')) status = 'Review';
      else if (cleanStatus.includes('pend')) status = 'Pending';

      // Insert Task
      await db.task.create({
        data: {
          date: formattedDate,
          projectId,
          description,
          durationMinutes,
          status,
          notes: String(notesVal || '').trim() || null,
        },
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalRowsProcessed: rawRows.length,
    });
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import file' },
      { status: 500 }
    );
  }
}
