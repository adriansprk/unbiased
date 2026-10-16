// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobState } from '../db';
import { findOrCreateJob, isStale, toJobView } from '../jobs';
import type { Job } from '../types';

const db = vi.hoisted(() => ({
    findJobsForArticle: vi.fn(),
    createJob: vi.fn(),
}));
vi.mock('../db', () => db);

const NOW = Date.parse('2026-10-16T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const state = (status: Job['status'], updatedMinutesAgo: number): JobState => ({
    id: `${status}-${updatedMinutesAgo}`,
    status,
    created_at: minutesAgo(updatedMinutesAgo + 1),
    updated_at: minutesAgo(updatedMinutesAgo),
});

describe('findOrCreateJob', () => {
    beforeEach(() => {
        vi.useFakeTimers({ now: NOW });
        db.findJobsForArticle.mockReset();
        db.createJob.mockReset().mockResolvedValue({ id: 'new-job' });
    });

    it('serves a finished analysis without starting a new one', async () => {
        db.findJobsForArticle.mockResolvedValue([state('Complete', 60 * 24)]);

        expect(await findOrCreateJob('https://www.nytimes.com/a?utm_source=x', 'en')).toEqual({
            id: 'Complete-1440',
            isNew: false,
        });
        expect(db.findJobsForArticle).toHaveBeenCalledWith('https://nytimes.com/a', 'en');
        expect(db.createJob).not.toHaveBeenCalled();
    });

    it('joins an analysis that is still running', async () => {
        db.findJobsForArticle.mockResolvedValue([state('Analyzing', 1)]);

        expect(await findOrCreateJob('https://example.com/a', 'de')).toEqual({ id: 'Analyzing-1', isNew: false });
        expect(db.createJob).not.toHaveBeenCalled();
    });

    it('starts over when the running job has stalled', async () => {
        db.findJobsForArticle.mockResolvedValue([state('Fetching', 30)]);

        expect(await findOrCreateJob('https://example.com/a', 'en')).toEqual({ id: 'new-job', isNew: true });
        expect(db.createJob).toHaveBeenCalledWith({
            url: 'https://example.com/a',
            normalized_url: 'https://example.com/a',
            language: 'en',
        });
    });

    it('creates a job for an article nobody has requested', async () => {
        db.findJobsForArticle.mockResolvedValue([]);
        expect(await findOrCreateJob('https://example.com/a', 'en')).toEqual({ id: 'new-job', isNew: true });
    });
});

describe('isStale', () => {
    it('only applies to unfinished jobs without progress for 10 minutes', () => {
        expect(isStale(state('Analyzing', 9), NOW)).toBe(false);
        expect(isStale(state('Analyzing', 11), NOW)).toBe(true);
        expect(isStale(state('Complete', 600), NOW)).toBe(false);
    });
});

describe('toJobView', () => {
    const row = (fields: Partial<Job>): Job => ({
        id: 'job-1',
        url: 'https://www.spiegel.de/a',
        normalized_url: 'https://spiegel.de/a',
        language: 'de',
        status: 'Complete',
        error_message: null,
        analysis_results: null,
        job_details: null,
        article_title: null,
        article_text: null,
        article_author: null,
        article_source_name: null,
        article_canonical_url: null,
        article_preview_image_url: null,
        article_publication_date: null,
        created_at: minutesAgo(5),
        updated_at: minutesAgo(1),
        ...fields,
    });

    it('maps a running job and flags paywalled sources', () => {
        const view = toJobView(row({ status: 'Processing', article_title: 'Titel' }), NOW);
        expect(view).toMatchObject({ status: 'Fetching', pending: true, failure: null, paywalled: true });
        expect(view.article?.title).toBe('Titel');
    });

    it('classifies failures', () => {
        expect(toJobView(row({ status: 'Failed', error_message: 'CONTENT_UNAVAILABLE_ERROR: no snapshot' }), NOW).failure)
            .toBe('contentUnavailable');
        expect(toJobView(row({ status: 'Failed', error_message: 'ANALYSIS_ERROR: boom' }), NOW).failure).toBe('failed');
        expect(toJobView(row({ status: 'Analyzing', updated_at: minutesAgo(30) }), NOW)).toMatchObject({
            status: 'Failed',
            pending: false,
            failure: 'timedOut',
        });
    });

    it('reads legacy rows: job_details fields and images behind the retired proxy', () => {
        const legacy = toJobView(
            row({
                job_details: {
                    title: 'Legacy',
                    siteName: 'Old Source',
                    images: [{ url: 'https://cdn.example.com/a.jpg' }, { url: 'https://cdn.example.com/b.jpg', primary: true }],
                },
            }),
            NOW
        );
        expect(legacy.article).toMatchObject({
            title: 'Legacy',
            source: 'Old Source',
            imageUrl: 'https://cdn.example.com/b.jpg',
        });

        const proxied = toJobView(
            row({
                article_title: 'T',
                article_preview_image_url:
                    'https://api-unbiased.adriancares.com/api/image-proxy?url=' +
                    encodeURIComponent('https://cdn.example.com/c.jpg'),
            }),
            NOW
        );
        expect(proxied.article?.imageUrl).toBe('https://cdn.example.com/c.jpg');
    });
});
