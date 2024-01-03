-- @block
CREATE TABLE wordsbk (
    id serial PRIMARY KEY,
    word varchar(255) UNIQUE NOT NULL,
    sentence text,
    definition text,
    frequencies integer[],
    frequency_median numeric,
    tags text [],
    url text,
    clipboard text,
    audio bytea [],
    -- Store audio data as bytea array
    html text, -- jsonb,
    image bytea [],
    -- Store image data as bytea array
    timestamp bigint,
    time timestamp,
    status text,
    flag_number integer,
    definitions text [],
    reading text,
    sentence_reading text,
    hint text,
    pitch text,
    extra jsonb,
    pitch_pos integer [],
    dicts text [],
    other_sentences text [],
    type text,
    learning integer,
    known integer,
    size integer,
    word_length integer,
    occurrences integer,
    chars text [],
    alternatives text [],
    synonyms text [],
    antonyms text [],
    url_loc text,
    day integer,
    options text [],
    seen boolean,
    temp boolean,
    is_anki boolean,
    has_s_audio boolean,
    has_w_audio boolean,
    has_images boolean,
    moe boolean,
    comment text,
    prev text,
    clips text [],
    info jsonb,
    notes text [],
    anki jsonb,
    anki_id integer
);

-- @block Selection word
select word,
    reading
from words;
-- @block Selection all
select *
from words;
-- @block Backup
DROP TABLE IF EXISTS words_backup3;
CREATE TABLE words_backup3 (LIKE words INCLUDING CONSTRAINTS) INHERITS (words);
INSERT INTO words_backup3
SELECT *
FROM words;
--@block
SELECT * --count(*)
FROM words_backup2;
-- @block Restore
INSERT INTO words
SELECT *
FROM words_backup3;
-- @block Deletion
select word,
    reading
from words;
begin SAVEPOINT original
delete from words
where reading is null
    or reading = ''
    or length(reading) < 1
    or word ~ '[A-Za-z]';
    or reading ~ '[A-Za-z]';
-- word !~ '^[\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Han}]+$';
SELECT *
FROM words;
-- ROLLBACK to original
-- commit
end

-- @block Duplicates
DELETE FROM words
WHERE (word, reading) IN (
-- @block
    SELECT word, reading
    FROM words
    ORDER by reading
    GROUP BY word, reading
    HAVING COUNT(*) > 1
--);


-- @block Update
update words
set moe = TRUE
where flag_number < 0;
select word,
    reading
from words;
-- update words set reading = 'あいうえお' where word = 'abc';
-- @block
select reading, count(*) from words
-- HAVING count(*) > 0
GROUP BY reading
having count(reading) > 2
ORDER by count(*) DESC;

-- @block
SELECT min(time), max(time) from words;-- where timestamp > 1700645099020;
-- @block
SELECT sum(flag_number) from words;
-- @block
delete from words where 1=1

-- @block
-- @block
-- @block
-- @block
-- @block
-- @block
-- @block
-- @block
-- @block

-- @block
select DISTINCT reading, word, time from words
-- where reading like '%ts%'
ORDER BY reading asc, word;
