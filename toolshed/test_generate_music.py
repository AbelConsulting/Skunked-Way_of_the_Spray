import unittest
from unittest.mock import patch

import numpy as np

import generate_audio_assets as assets
from toolshed import generate_music as music


class GameplayArrangementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audio, cls.sample_rate = music.create_gameplay_music(
            duration=64, bpm=120, arranged=True
        )

    def test_output_length_headroom_and_loop_boundary(self):
        self.assertEqual(self.audio.shape, (64 * self.sample_rate,))
        self.assertTrue(np.isfinite(self.audio).all())
        self.assertLessEqual(np.max(np.abs(self.audio)), 0.700001)
        self.assertLess(abs(self.audio[-1] - self.audio[0]), 1 / 32767)
        self.assertGreater(np.sqrt(np.mean(self.audio ** 2)), 0.05)

    def test_original_melody_notes_timing_and_envelopes_are_preserved(self):
        def render_lead(arranged):
            events = []
            original = music.generate_note

            def capture(frequency, duration, sample_rate, volume, distortion):
                note = original(frequency, duration, sample_rate, volume, distortion)
                if not distortion:
                    events.append((frequency, duration, sample_rate, volume, note))
                return note

            with patch.object(music, 'generate_note', side_effect=capture):
                music.create_gameplay_music(duration=64, bpm=120, arranged=arranged)
            return events

        legacy = render_lead(False)
        arranged = render_lead(True)
        self.assertEqual(len(arranged), 128)
        for old, new in zip(legacy, arranged):
            self.assertEqual(old[:4], new[:4])
            np.testing.assert_array_equal(old[4], new[4])

    def test_arrangement_is_repeatable(self):
        audio, _ = music.create_gameplay_music(duration=64, bpm=120, arranged=True)
        np.testing.assert_array_equal(self.audio, audio)

    def test_phrases_vary_and_breakdown_is_quieter(self):
        phrases = self.audio.reshape(4, -1)
        for first, second in zip(phrases, phrases[1:]):
            self.assertGreater(np.sqrt(np.mean((first - second) ** 2)), 0.01)
        breakdown = self.audio[48 * self.sample_rate:56 * self.sample_rate]
        build = self.audio[56 * self.sample_rate:]
        self.assertLess(np.sqrt(np.mean(breakdown ** 2)),
                        np.sqrt(np.mean(build ** 2)) * 0.85)

    def test_nondefault_tempo_has_complete_loop(self):
        audio, sr = music.create_gameplay_music(
            duration=32 * 4 * 60 / 110, bpm=110, arranged=True
        )
        self.assertLessEqual(abs(len(audio) - 32 * 4 * 60 / 110 * sr), 1)
        self.assertLess(abs(audio[-1] - audio[0]), 1 / 32767)

    def test_incomplete_loops_and_invalid_tempos_are_rejected(self):
        for duration in (0, -64, 60, float('nan'), float('inf')):
            with self.subTest(duration=duration), self.assertRaises(ValueError):
                music.create_gameplay_music(duration=duration, arranged=True)
        for bpm in (0, -120, float('nan'), float('inf')):
            with self.subTest(bpm=bpm), self.assertRaises(ValueError):
                music.create_gameplay_music(duration=64, bpm=bpm, arranged=True)


class LevelSoundtrackTests(unittest.TestCase):
    def test_level_instruments_loops_and_mix(self):
        for theme, (bpm, lead, reply) in music.LEVEL_ARRANGEMENTS.items():
            with self.subTest(theme=theme):
                with patch.object(music, 'instrument_note', wraps=music.instrument_note) as notes:
                    audio, sr = music.create_level_music(theme)
                self.assertEqual({call.args[0] for call in notes.call_args_list}, {lead, reply})
                self.assertLessEqual(abs(len(audio) - 32 * 4 * 60 / bpm * sr), 1)
                self.assertTrue(np.isfinite(audio).all())
                self.assertLessEqual(np.max(np.abs(audio)), 0.700001)
                self.assertGreater(np.sqrt(np.mean(audio ** 2)), 0.1)
                self.assertLessEqual(np.sqrt(np.mean(audio ** 2)), 0.160001)
                self.assertLess(abs(audio[-1] - audio[0]), 1 / 32767)
                repeated, _ = music.create_level_music(theme)
                np.testing.assert_array_equal(audio, repeated)
                base, _ = music.create_gameplay_music(
                    duration=32 * 4 * 60 / bpm, bpm=bpm, arranged=True
                )
                # Remove the shared accompaniment's best-fit gain to measure the new parts.
                residual = audio - base * np.dot(audio, base) / np.dot(base, base)
                self.assertGreater(np.sqrt(np.mean(residual ** 2)), 0.025)
                bar = 4 * 60 / bpm * sr
                breakdown = audio[round(24 * bar):round(28 * bar)]
                build = audio[round(28 * bar):]
                self.assertLess(np.sqrt(np.mean(breakdown ** 2)),
                                np.sqrt(np.mean(build ** 2)) * 0.85)

    def test_instruments_have_distinct_tones_and_released_edges(self):
        voices = {voice for _, *pair in music.LEVEL_ARRANGEMENTS.values() for voice in pair}
        rendered = []
        for voice in voices:
            audio = music.instrument_note(voice, 440, 0.3, 22050, np.random.default_rng(0))
            self.assertEqual(audio.shape, (6615,))
            self.assertLess(abs(audio[0]), 1 / 32767)
            self.assertLess(abs(audio[-1]), 1 / 32767)
            self.assertTrue(np.isfinite(audio).all())
            for other in rendered:
                self.assertLess(abs(np.corrcoef(audio, other)[0, 1]), 0.995)
            rendered.append(audio)
        with self.assertRaises(ValueError):
            music.instrument_note('unknown', 440, 0.3, 22050, np.random.default_rng(0))


class GameOverMusicTests(unittest.TestCase):
    def test_short_quiet_one_shot_with_released_ending(self):
        audio, sr = music.create_game_over_music()
        self.assertEqual(len(audio), round((0.6 + 16 * 60 / 72) * sr))
        self.assertTrue(np.isfinite(audio).all())
        self.assertLessEqual(np.max(np.abs(audio)), 0.500001)
        self.assertAlmostEqual(np.sqrt(np.mean(audio ** 2)), 0.10, places=6)
        np.testing.assert_array_equal(audio[:round(0.6 * sr)], 0)
        np.testing.assert_array_equal(audio[-round(0.3 * sr):], 0)
        repeated, _ = music.create_game_over_music()
        np.testing.assert_array_equal(audio, repeated)

    def test_descending_minor_melody_with_flute_and_piano_only(self):
        with patch.object(music, 'instrument_note', wraps=music.instrument_note) as notes:
            music.create_game_over_music()
        self.assertEqual({call.args[0] for call in notes.call_args_list},
                         {'flute', 'electric_piano'})
        melody = [call.args[1] for call in notes.call_args_list if call.args[0] == 'flute']
        self.assertEqual(melody[:4], [659.25, 523.25, 493.88, 440.00])
        self.assertTrue(all(a > b for a, b in zip(melody[:-2], melody[1:-1])))
        self.assertEqual(melody[-1], 220.00)


class MenuAudioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audio, cls.sample_rate = music.create_menu_music()

    def test_menu_duration_loudness_and_loop(self):
        self.assertEqual(self.audio.shape, (40 * self.sample_rate,))
        self.assertTrue(np.isfinite(self.audio).all())
        self.assertLessEqual(np.max(np.abs(self.audio)), 0.550001)
        self.assertAlmostEqual(np.sqrt(np.mean(self.audio ** 2)), 0.11, places=6)
        self.assertLess(abs(self.audio[-1] - self.audio[0]), 1 / 32767)

    def test_flute_plays_the_gameplay_melody(self):
        expected = (
            440.00, 523.25, 659.25, 523.25,
            349.23, 440.00, 523.25, 698.46,
            329.63, 392.00, 523.25, 659.25,
            293.66, 392.00, 246.94, 392.00,
        ) * 4
        with patch.object(music, 'flute_note', wraps=music.flute_note) as flute:
            music.create_menu_music()
        self.assertEqual(tuple(call.args[0] for call in flute.call_args_list), expected)
        for beat, frequency in enumerate(expected):
            start = round((beat * 60 / 96 + 0.12) * self.sample_rate)
            end = round((beat * 60 / 96 + 0.4) * self.sample_rate)
            segment = self.audio[start:end] * np.hanning(end - start)
            spectrum = np.abs(np.fft.rfft(segment))
            peak_frequency = np.argmax(spectrum) * self.sample_rate / len(segment)
            self.assertAlmostEqual(peak_frequency, frequency, delta=4)

    def test_no_sub_bass_drone_and_varied_phrases(self):
        spectrum = np.abs(np.fft.rfft(self.audio)) ** 2
        frequencies = np.fft.rfftfreq(len(self.audio), 1 / self.sample_rate)
        self.assertLess(spectrum[frequencies < 100].sum() / spectrum.sum(), 0.001)
        phrases = self.audio.reshape(4, -1)
        for first, second in zip(phrases, phrases[1:]):
            self.assertGreater(np.sqrt(np.mean((first - second) ** 2)), 0.005)
        repeated, _ = music.create_menu_music()
        np.testing.assert_array_equal(repeated, self.audio)

    def test_button_sounds_are_short_soft_and_have_released_edges(self):
        self.assertEqual(set(assets.MENU_SOUNDS), {
            'ui_hover', 'menu_move', 'menu_select', 'ui_confirm', 'ui_back'
        })
        for name, (frequencies, duration) in assets.MENU_SOUNDS.items():
            with self.subTest(name=name):
                audio = np.array(assets.menu_sound_samples(name))
                audible_samples = int(duration * assets.SAMPLE_RATE)
                tail_samples = round(assets.MENU_SOUND_TAIL * assets.SAMPLE_RATE)
                self.assertEqual(len(audio), audible_samples + tail_samples)
                np.testing.assert_array_equal(audio[audible_samples:], 0)
                self.assertLessEqual(duration, 0.18)
                self.assertTrue(np.isfinite(audio).all())
                self.assertGreater(np.max(np.abs(audio)), 0.1)
                self.assertLess(np.max(np.abs(audio)), 0.22)
                for note in range(len(frequencies)):
                    start = round(note * audible_samples / len(frequencies))
                    end = round((note + 1) * audible_samples / len(frequencies))
                    self.assertEqual(audio[start], 0)
                    self.assertEqual(audio[end - 1], 0)


if __name__ == '__main__':
    unittest.main()
