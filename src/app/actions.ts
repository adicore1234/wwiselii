'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getLeads(query = '') {
  try {
    const leads = await prisma.lead.findMany({
      where: query ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { area: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    return leads;
  } catch (error) {
    console.error('Error fetching leads:', error);
    return [];
  }
}

export type CallLogInput = {
  leadId: string;
  text: string;
  outcome?: string;
  contactPerson?: string;
  temperature?: string;
  nextAction?: string;
  newStatus?: string;
  followUpDate?: Date | null;
  scheduledTime?: string;
};

export async function addCallLog(input: CallLogInput) {
  try {
    const { 
      leadId, 
      text, 
      outcome, 
      contactPerson, 
      temperature, 
      nextAction, 
      newStatus, 
      followUpDate, 
      scheduledTime 
    } = input;

    // 1. Create the note with all rich call fields
    const note = await prisma.note.create({
      data: {
        text,
        leadId,
        outcome: outcome || null,
        contactPerson: contactPerson || null,
        temperature: temperature || null,
        nextAction: nextAction || null,
        scheduledTime: scheduledTime || null
      }
    });

    // 2. Update the parent lead
    const updateData: any = {};
    if (outcome) updateData.lastCallOutcome = outcome;
    if (contactPerson) updateData.contactPerson = contactPerson;
    if (temperature) updateData.temperature = temperature;
    if (newStatus) updateData.status = newStatus;
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate;
    if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;

    let updatedLead = null;
    if (Object.keys(updateData).length > 0) {
      updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: updateData
      });
    }

    return { success: true, note, updatedLead };
  } catch (error) {
    console.error('Error recording call log:', error);
    return { success: false, error: 'Failed to record call log' };
  }
}

// Backwards compatibility for existing caller
export async function addNote(leadId: string, text: string, outcome?: string, newStatus?: string, followUpDate?: Date | null) {
  return addCallLog({
    leadId,
    text,
    outcome,
    newStatus,
    followUpDate
  });
}

export async function updateLeadStatus(leadId: string, status: string) {
  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status }
    });
    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error('Error updating status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

export async function updateLeadDetails(
  leadId: string, 
  data: { 
    status?: string; 
    contactPerson?: string; 
    temperature?: string; 
    followUpDate?: Date | null; 
    scheduledTime?: string;
    address?: string;
    area?: string;
    phone?: string;
  }
) {
  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data
    });
    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error('Error updating lead details:', error);
    return { success: false, error: 'Failed to update lead details' };
  }
}

export async function createNewLead(data: {
  name: string;
  phone: string;
  address?: string;
  area?: string;
  contactPerson?: string;
  status?: string;
}) {
  try {
    const newLead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address || null,
        area: data.area || null,
        contactPerson: data.contactPerson || null,
        status: data.status || 'חדש',
      },
      include: {
        notes: true
      }
    });
    return { success: true, lead: newLead };
  } catch (error) {
    console.error('Error creating lead:', error);
    return { success: false, error: 'Failed to create lead' };
  }
}

export async function updateDocumentationField(
  leadId: string, 
  field: 'callAnswer' | 'interest' | 'worthInvesting' | 'callAgain' | 'dealStatus', 
  value: string | null
) {
  try {
    const updateData: any = {
      [field]: value
    };

    let autoStatus: string | undefined = undefined;
    let autoTemp: string | undefined = undefined;

    if (field === 'interest') {
      if (value === 'מעוניין') {
        autoStatus = 'בטיפול';
        autoTemp = 'hot';
      } else if (value === 'לא מעוניין') {
        autoStatus = 'לא רלוונטי';
        autoTemp = 'cold';
      }
    } else if (field === 'worthInvesting') {
      if (value === 'שווה להשקיע') {
        autoStatus = 'בטיפול';
        autoTemp = 'urgent';
      }
    } else if (field === 'callAgain') {
      if (value === 'להתקשר') {
        autoStatus = 'בטיפול';
      } else if (value === 'לא להתקשר') {
        autoStatus = 'לא רלוונטי';
      }
    } else if (field === 'callAnswer') {
      if (value === 'ענה') {
        autoStatus = 'בטיפול';
      }
    } else if (field === 'dealStatus') {
      if (value === 'כבר לקוח') {
        autoStatus = 'סגור';
      } else if (value === 'כבר דיברנו') {
        autoStatus = 'בטיפול';
      }
    }

    if (autoStatus) updateData.status = autoStatus;
    if (autoTemp) updateData.temperature = autoTemp;
    if (value) updateData.lastCallOutcome = value;

    const labels: Record<string, string> = {
      callAnswer: 'מענה',
      interest: 'רמת עניין',
      worthInvesting: 'כדאיות',
      callAgain: 'התקשרות',
      dealStatus: 'סטטוס עסקה'
    };

    const note = await prisma.note.create({
      data: {
        leadId,
        outcome: value,
        text: `עדכון ${labels[field] || field}: ${value || 'בוטל'}`,
        [field]: value,
        temperature: autoTemp || null
      }
    });

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData
    });

    return { success: true, lead: updatedLead, note };
  } catch (error) {
    console.error('Error updating documentation field:', error);
    return { success: false, error: 'Failed to update documentation field' };
  }
}

export async function quickLogOutcome(leadId: string, outcome: string, temperature?: string) {
  try {
    const noteData: any = {
      leadId,
      outcome,
      temperature: temperature || null,
      text: `תיעוד מהיר: ${outcome}${temperature ? ` (${temperature})` : ''}`,
    };

    let autoStatus: string | undefined = undefined;
    if (outcome === 'לא מעוניין' || outcome === 'מספר שגוי / מנותק' || outcome === 'לא שווה להשקיע' || outcome === 'לא להתקשר') {
      autoStatus = 'לא רלוונטי';
    } else if (outcome === 'מעוניין' || outcome === 'ביקש הצעת מחיר' || outcome === 'ענה' || outcome === 'שווה להשקיע' || outcome === 'להתקשר') {
      autoStatus = 'בטיפול';
    } else if (outcome === 'סגור') {
      autoStatus = 'סגור';
    }

    const updateData: any = {
      lastCallOutcome: outcome,
    };

    if (outcome === 'ענה' || outcome === 'לא ענה') {
      updateData.callAnswer = outcome;
      noteData.callAnswer = outcome;
    } else if (outcome === 'מעוניין' || outcome === 'לא מעוניין') {
      updateData.interest = outcome;
      noteData.interest = outcome;
    } else if (outcome === 'שווה להשקיע' || outcome === 'לא שווה להשקיע') {
      updateData.worthInvesting = outcome;
      noteData.worthInvesting = outcome;
    } else if (outcome === 'להתקשר' || outcome === 'לא להתקשר') {
      updateData.callAgain = outcome;
      noteData.callAgain = outcome;
    }

    if (temperature !== undefined) updateData.temperature = temperature;
    if (autoStatus) updateData.status = autoStatus;

    const note = await prisma.note.create({
      data: noteData
    });

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData
    });

    return { success: true, note, lead: updatedLead };
  } catch (error) {
    console.error('Error in quickLogOutcome:', error);
    return { success: false, error: 'Failed to quick log' };
  }
}
