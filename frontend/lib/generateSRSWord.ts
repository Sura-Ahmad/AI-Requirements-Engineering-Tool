import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  TableOfContents, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

// Helpers 

const PT = (pt: number) => pt * 2; // docx uses half-points

const NOTE_COLOR = '888888';
const HEAD1_COLOR = '1E2A4A';

function noteText(msg: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: `[NOTE: ${msg}]`,
        italics: true,
        color: NOTE_COLOR,
        size: PT(11),
        font: 'Times New Roman',
      }),
    ],
  });
}

function bodyPara(text: string, spaceAfter = 120): Paragraph {
  return new Paragraph({
    spacing: { after: spaceAfter },
    children: [new TextRun({ text, size: PT(12), font: 'Times New Roman' })],
  });
}

function bulletPara(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: PT(12), font: 'Times New Roman' })],
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text, bold: true, size: PT(16), font: 'Times New Roman', color: HEAD1_COLOR })],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: PT(14), font: 'Times New Roman', color: HEAD1_COLOR })],
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: PT(12), font: 'Times New Roman' })],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 120 } });
}

// SRS Text Parser 

function parseSRSSections(srsText: string): Record<string, string> {
  const map: Record<string, string> = {};
  const lines = srsText.split('\n');
  let currentKey = '';
  const buffer: string[] = [];

  const flush = () => {
    if (currentKey) map[currentKey] = buffer.join('\n').trim();
    buffer.length = 0;
  };

  for (const raw of lines) {
    // Strip markdown markers (#, *, **)
    const line = raw.replace(/^#+\s*/, '').replace(/^\*{1,2}(.*)\*{1,2}$/, '$1').trim();
    // Match section numbers: "1.", "1.1", "1.2.3", followed by title text
    const m = line.match(/^(\d+(?:\.\d+)*)[.\):]?\s+\S/);
    if (m) {
      flush();
      currentKey = m[1];
      // Don't store the heading line itself, only content lines below it
    } else if (line && currentKey) {
      buffer.push(line);
    }
  }
  flush();
  return map;
}

function sectionParagraphs(map: Record<string, string>, key: string, noteFallback: string): Paragraph[] {
  const content = map[key];
  if (!content) return [noteText(noteFallback)];

  const paragraphs: Paragraph[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    paragraphs.push(bodyPara(t));
  }
  return paragraphs.length ? paragraphs : [noteText(noteFallback)];
}

// Cover-page info table 

function infoTable(projectName: string): Table {
  const cellStyle = {
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
  };

  const labelCell = (text: string) =>
    new TableCell({
      ...cellStyle,
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8ECF4' },
      width: { size: 30, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: PT(11), font: 'Times New Roman' })],
      })],
    });

  const valueCell = (text: string) =>
    new TableCell({
      ...cellStyle,
      width: { size: 70, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text, size: PT(11), font: 'Times New Roman' })],
      })],
    });

  const row = (label: string, value: string) =>
    new TableRow({ children: [labelCell(label), valueCell(value)] });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      row('Document Title', `Software Requirements Specification – ${projectName}`),
      row('Standard', 'IEEE Std 830'),
      row('Version', '1.0'),
      row('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
      row('Status', 'Draft'),
      row('Confidentiality', 'Internal Use Only'),
    ],
  });
}

// Revision-history table 

function revisionTable(): Table {
  const headerCell = (text: string) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E2A4A' },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' },
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: PT(11), font: 'Times New Roman', color: 'FFFFFF' })],
      })],
    });

  const bodyCell = (text: string) =>
    new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text, size: PT(11), font: 'Times New Roman', color: NOTE_COLOR, italics: !!text.startsWith('[') })],
      })],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell('Version'),
          headerCell('Date'),
          headerCell('Description of Change'),
          headerCell('Author'),
        ],
      }),
      new TableRow({
        children: [
          bodyCell('1.0'),
          bodyCell(new Date().toLocaleDateString()),
          bodyCell('Initial Draft'),
          bodyCell('[NOTE: Author name]'),
        ],
      }),
      new TableRow({
        children: [bodyCell(''), bodyCell(''), bodyCell('[NOTE: Future revisions]'), bodyCell('')],
      }),
    ],
  });
}

//  Requirements table 

function requirementsTable(reqs: { code: string; description: string }[]): Table {
  const headerCell = (text: string, pct: number) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8ECF4' },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: '1E2A4A' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E2A4A' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: pct, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: PT(11), font: 'Times New Roman', color: HEAD1_COLOR })],
      })],
    });

  const bodyCell = (text: string, pct: number, bold = false) =>
    new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: pct, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text, bold, size: PT(11), font: 'Times New Roman' })],
      })],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('ID', 15),
      headerCell('Description', 85),
    ],
  });

  const rows = reqs.map(r =>
    new TableRow({
      children: [bodyCell(r.code, 15, true), bodyCell(r.description, 85)],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  });
}

//  Main export 

export async function generateAndDownloadSRSWord(
  srsText: string,
  functional: { code: string; description: string }[],
  nonFunctional: { code: string; description: string }[],
  projectName: string,
) {
  const S = parseSRSSections(srsText);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: PT(12) },
        },
        heading1: {
          run: { font: 'Times New Roman', bold: true, size: PT(16), color: HEAD1_COLOR },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading2: {
          run: { font: 'Times New Roman', bold: true, size: PT(14), color: HEAD1_COLOR },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
        heading3: {
          run: { font: 'Times New Roman', bold: true, size: PT(12) },
          paragraph: { spacing: { before: 160, after: 60 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          
          // COVER PAGE
          
          new Paragraph({ spacing: { before: 1200 } }), // top padding

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: 'SOFTWARE REQUIREMENTS SPECIFICATION', bold: true, size: PT(24), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: 'IEEE Std 830', size: PT(13), font: 'Times New Roman', color: '555555' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 480 },
            children: [new TextRun({ text: '─'.repeat(55), size: PT(11), color: 'CCCCCC' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: projectName, bold: true, size: PT(20), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          infoTable(projectName),
          pageBreak(),

          
          // REVISION HISTORY
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: 'REVISION HISTORY', bold: true, size: PT(14), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          revisionTable(),
          pageBreak(),

          
          // TABLE OF CONTENTS
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: 'TABLE OF CONTENTS', bold: true, size: PT(14), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          new TableOfContents('Table of Contents', {
            hyperlink: true,
            headingStyleRange: '1-3',
          }),
          noteText('When the document is opened in Microsoft Word, right-click the table of contents and select "Update Field" to generate the page numbers.'),
          pageBreak(),

          
          // 1. INTRODUCTION
          
          h1('1. Introduction'),

          h2('1.1 Purpose'),
          ...sectionParagraphs(S, '1.1', 'Describe the purpose of this SRS document and the intended audience.'),

          h2('1.2 Scope'),
          ...sectionParagraphs(S, '1.2', 'Name the software product and describe what it will and will not do.'),

          h2('1.3 Definitions, Acronyms, and Abbreviations'),
          ...sectionParagraphs(S, '1.3', 'List and define all terms, acronyms, and abbreviations used in this document.'),

          h2('1.4 References'),
          noteText('List all referenced documents, standards, and sources (e.g., project plan, interface specifications, design documents). Include document title, version, and date.'),

          h2('1.5 Overview'),
          ...sectionParagraphs(S, '1.5', 'Describe what the rest of this SRS contains and how it is organized.'),

          
          // 2. OVERALL DESCRIPTION
          
          h1('2. Overall Description'),

          h2('2.1 Product Perspective'),
          ...sectionParagraphs(S, '2.1', 'Describe the context and origin of this product. Is it a new standalone system, part of a larger system, or a replacement for an existing one?'),

          h2('2.2 Product Functions'),
          ...sectionParagraphs(S, '2.2', 'Provide a summary of the major functions the product must perform or must let the user perform.'),

          h2('2.3 User Classes and Characteristics'),
          ...sectionParagraphs(S, '2.3', 'Identify the various user classes that are anticipated to use this product and describe their characteristics (e.g., technical level, frequency of use).'),

          h2('2.4 Operating Environment'),
          ...sectionParagraphs(S, '2.4', 'Describe the environment in which the software will operate (hardware platform, OS, other software components).'),

          h2('2.5 Design and Implementation Constraints'),
          ...sectionParagraphs(S, '2.5', 'Describe any items or issues that will limit the options available to the developers (e.g., regulatory policies, hardware limitations, programming language).'),

          h2('2.6 Assumptions and Dependencies'),
          noteText('List any assumed factors that could affect the requirements described in this SRS (e.g., availability of a specific operating system, external systems, third-party APIs). To be completed during detailed design.'),

          
          // 3. SPECIFIC REQUIREMENTS
          
          h1('3. Specific Requirements'),

          h2('3.1 Functional Requirements'),
          bodyPara('The following functional requirements define the essential behaviors and capabilities of the system:'),
          emptyLine(),
          functional.length > 0
            ? requirementsTable(functional)
            : noteText('No functional requirements generated yet.'),
          emptyLine(),

          h2('3.2 Non-Functional Requirements'),
          bodyPara('The following non-functional requirements define quality attributes, performance, and constraints of the system:'),
          emptyLine(),
          nonFunctional.length > 0
            ? requirementsTable(nonFunctional)
            : noteText('No non-functional requirements generated yet.'),
          emptyLine(),

          
          // 4. EXTERNAL INTERFACE REQUIREMENTS
          
          h1('4. External Interface Requirements'),
          bodyPara('This section describes the inputs and outputs of the system. Details are to be defined during the design phase.'),

          h2('4.1 User Interfaces'),
          noteText('Describe the logical characteristics of each interface between the software product and the users. This includes sample screen images, GUI standards, constraints, error message display standards, etc.'),

          h2('4.2 Hardware Interfaces'),
          noteText('Describe the logical and physical characteristics of each interface between the software product and the hardware components. Include supported device types, data formats, and communication protocols.'),

          h2('4.3 Software Interfaces'),
          noteText('Describe the connections between this product and other specific software components (name, version, source). Include databases, operating systems, tools, libraries, and integrated commercial components.'),

          h2('4.4 Communications Interfaces'),
          noteText('Describe the requirements associated with any communications functions required by this product, including e-mail, web browser, network communications protocols, and electronic forms.'),

          
          // 5. OTHER NON-FUNCTIONAL REQUIREMENTS
          
          h1('5. Other Non-Functional Requirements'),
          bodyPara('Additional quality attributes beyond those listed in Section 3.2:'),

          h2('5.1 Performance Requirements'),
          noteText('Specify numerical performance requirements such as response time, throughput, capacity, and degradation modes. To be completed once system load estimates are available.'),

          h2('5.2 Safety Requirements'),
          noteText('Specify requirements concerning loss, damage, or harm that could result from use of the product. Define any safeguards or fail-safe actions required.'),

          h2('5.3 Security Requirements'),
          noteText('Specify requirements for security, privacy, or integrity including authentication, authorization, data encryption, and audit logging requirements.'),

          h2('5.4 Software Quality Attributes'),
          noteText('Specify additional software quality characteristics such as adaptability, availability, correctness, flexibility, interoperability, maintainability, portability, reliability, reusability, robustness, testability, and usability.'),

          
          // APPENDICES
         
          h1('Appendix A: Glossary'),
          noteText('Define all terms not defined in Section 1.3 that are required to properly interpret this SRS. This section should be completed as the project progresses and domain-specific terminology is identified.'),

          h1('Appendix B: Analysis Models'),
          noteText('Optionally include relevant analysis models such as data flow diagrams, class diagrams, state-transition diagrams, entity-relationship diagrams, etc. To be added during the design phase.'),

          h1('Appendix C: Issues List'),
          noteText('This is a dynamic list of the open requirements issues that remain to be resolved — including TBDs, conflicts, and open questions — along with the name of the person responsible for resolving each issue.'),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `SRS_${projectName.replace(/\s+/g, '_')}.docx`);
}

//  Use Cases Word Generator 

interface UseCase {
  use_case_id?: string;
  title: string;
  actor: string;
  trigger?: string;
  preconditions: string;
  main_flow: string;
  alternative_flows?: string;
  exception_flows?: string;
  postconditions: string;
  priority?: string;
  related_requirements?: string;
}

function useCaseTable(uc: UseCase, index: number): (Paragraph | Table)[] {
  const labelCell = (text: string) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8ECF4' },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: 22, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: PT(11), font: 'Times New Roman', color: HEAD1_COLOR })],
      })],
    });

  const valueCell = (text: string) =>
    new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: 78, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        children: [new TextRun({ text, size: PT(11), font: 'Times New Roman' })],
      })],
    });

  const row = (label: string, value: string) =>
    new TableRow({ children: [labelCell(label), valueCell(value)] });

  // Title row with dark header spanning full width
  const titleRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        columnSpan: 2,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E2A4A' },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '1E2A4A' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E2A4A' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '1E2A4A' },
          right: { style: BorderStyle.SINGLE, size: 6, color: '1E2A4A' },
        },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({
            text: `${uc.use_case_id || `UC-${String(index + 1).padStart(2, '0')}`}: ${uc.title}`,
            bold: true,
            size: PT(12),
            font: 'Times New Roman',
            color: 'FFFFFF',
          })],
        })],
      }),
    ],
  });

  const rows = [
    row('Actor', uc.actor),
  ];
  if (uc.trigger) rows.push(row('Trigger', uc.trigger));
  rows.push(row('Preconditions', uc.preconditions));
  rows.push(row('Main Flow', uc.main_flow));
  if (uc.alternative_flows) rows.push(row('Alternative Flows', uc.alternative_flows));
  if (uc.exception_flows) rows.push(row('Exception Flows', uc.exception_flows));
  rows.push(row('Postconditions', uc.postconditions));
  if (uc.priority) rows.push(row('Priority', uc.priority));
  if (uc.related_requirements) rows.push(row('Related Requirements', uc.related_requirements));

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [titleRow, ...rows],
    }),
    emptyLine(),
  ];
}

export async function generateAndDownloadUseCasesWord(
  useCases: UseCase[],
  projectName: string,
) {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Times New Roman', size: PT(12) } },
        heading1: {
          run: { font: 'Times New Roman', bold: true, size: PT(16), color: HEAD1_COLOR },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading2: {
          run: { font: 'Times New Roman', bold: true, size: PT(14), color: HEAD1_COLOR },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // Cover Page 
          new Paragraph({ spacing: { before: 1200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: 'USE CASE SPECIFICATION DOCUMENT', bold: true, size: PT(24), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 480 },
            children: [new TextRun({ text: '─'.repeat(55), size: PT(11), color: 'CCCCCC' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: projectName, bold: true, size: PT(20), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8ECF4' },
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Total Use Cases', bold: true, size: PT(11), font: 'Times New Roman' })] })],
                }),
                new TableCell({
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: String(useCases.length), size: PT(11), font: 'Times New Roman' })] })],
                }),
              ]}),
              new TableRow({ children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8ECF4' },
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, size: PT(11), font: 'Times New Roman' })] })],
                }),
                new TableCell({
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), size: PT(11), font: 'Times New Roman' })] })],
                }),
              ]}),
              new TableRow({ children: [
                new TableCell({
                  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E8ECF4' },
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [new TextRun({ text: 'Version', bold: true, size: PT(11), font: 'Times New Roman' })] })],
                }),
                new TableCell({
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: '1.0', size: PT(11), font: 'Times New Roman' })] })],
                }),
              ]}),
            ],
          }),
          pageBreak(),

          //  Table of Contents 
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: 'TABLE OF CONTENTS', bold: true, size: PT(14), font: 'Times New Roman', color: HEAD1_COLOR })],
          }),
          new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
          noteText('Right-click the table of contents and select "Update Field" to generate page numbers.'),
          pageBreak(),

          //  Introduction 
          h1('1. Introduction'),
          bodyPara('This document describes the use cases for the ' + projectName + ' system. Each use case represents a specific interaction between an actor and the system to achieve a goal.'),
          emptyLine(),
          h2('1.1 Purpose'),
          bodyPara('This Use Case Specification describes the functional behavior of the system from the end-user perspective. It serves as a basis for system design, implementation, and testing.'),
          h2('1.2 Scope'),
          bodyPara(`This document covers all ${useCases.length} identified use cases for the ${projectName} system.`),
          h2('1.3 Actors'),
          noteText('List all actors (users or external systems) that interact with this system. To be refined during detailed design.'),

          //  Use Cases 
          h1('2. Use Case Descriptions'),
          bodyPara('The following section details each use case with its actor, preconditions, main flow, and postconditions.'),
          emptyLine(),
          ...useCases.flatMap((uc, i) => useCaseTable(uc, i)),

          //  Summary Table 
          h1('3. Use Case Summary'),
          bodyPara('The following table provides a quick reference for all use cases in this document:'),
          emptyLine(),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E2A4A' },
                    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, left: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, right: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' } },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    width: { size: 12, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ID', bold: true, size: PT(11), font: 'Times New Roman', color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E2A4A' },
                    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, left: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, right: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' } },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Use Case Title', bold: true, size: PT(11), font: 'Times New Roman', color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E2A4A' },
                    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, left: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, right: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' } },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Primary Actor', bold: true, size: PT(11), font: 'Times New Roman', color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1E2A4A' },
                    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, left: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' }, right: { style: BorderStyle.SINGLE, size: 4, color: '1E2A4A' } },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    width: { size: 13, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Priority', bold: true, size: PT(11), font: 'Times New Roman', color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              ...useCases.map((uc, i) =>
                new TableRow({
                  children: [
                    new TableCell({
                      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: uc.use_case_id || `UC-${String(i + 1).padStart(2, '0')}`, bold: true, size: PT(11), font: 'Times New Roman' })] })],
                    }),
                    new TableCell({
                      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: uc.title, size: PT(11), font: 'Times New Roman' })] })],
                    }),
                    new TableCell({
                      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: uc.actor, size: PT(11), font: 'Times New Roman' })] })],
                    }),
                    new TableCell({
                      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: uc.priority || '—', size: PT(11), font: 'Times New Roman' })] })],
                    }),
                  ],
                })
              ),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `UseCases_${projectName.replace(/\s+/g, '_')}.docx`);
}
